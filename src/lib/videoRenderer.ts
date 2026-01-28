import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    return ffmpeg;
}

export async function resetFFmpeg() {
    ffmpeg = null;
}

export async function renderVideo(production: any, onProgress: (progress: number) => void) {
    console.log('🎬 Starting Gold Render with production:', production);
    const ffmpeg = await loadFFmpeg();

    try {
        const files = await ffmpeg.listDir('.');
        for (const f of files) {
            if (f.name !== '.' && f.name !== '..') {
                await ffmpeg.deleteFile(f.name).catch(() => { });
            }
        }
    } catch (e) {
        console.warn('FS Cleanup failed:', e);
    }

    ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg Log]', message);
    });

    ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress * 100);
    });

    const scenes = production.scenes;
    const filterComplex: string[] = [];
    const inputs: string[] = [];
    const sceneDurations: number[] = [];

    function idx_to_letter(idx: number) { return String.fromCharCode(97 + idx); }

    try {
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const assetUrl = scene.videoUrl || scene.imageUrl;
            const audioUrl = scene.audioUrl;

            if (!assetUrl) continue;

            const assetExt = scene.videoUrl ? 'mp4' : 'jpg';
            const inputAssetFile = `input_${i}.${assetExt}`;
            const inputAudioFile = `audio_${i}.mp3`;

            try {
                const assetBuffer = await fetchFile(assetUrl);
                await ffmpeg.writeFile(inputAssetFile, assetBuffer);
            } catch (e) {
                throw new Error(`تعذر تحميل ملف الصورة/الفيديو للمشهد ${i + 1}`);
            }

            if (scene.videoUrl) {
                inputs.push('-stream_loop', '-1', '-i', inputAssetFile);
            } else {
                inputs.push('-i', inputAssetFile);
            }

            let hasAudio = false;
            if (audioUrl) {
                try {
                    const audioBuffer = await fetchFile(audioUrl);
                    await ffmpeg.writeFile(inputAudioFile, audioBuffer);
                    inputs.push('-i', inputAudioFile);
                    hasAudio = true;
                } catch (e) {
                    inputs.push('-f', 'lavfi', '-t', '5', '-i', 'anullsrc=r=44100:cl=stereo');
                }
            } else {
                inputs.push('-f', 'lavfi', '-t', '5', '-i', 'anullsrc=r=44100:cl=stereo');
            }

            const duration = (hasAudio && scene.subtitles && scene.subtitles.length > 0)
                ? (scene.subtitles[scene.subtitles.length - 1].audio_offset / 10000 / 1000) + 1.2
                : 5;
            sceneDurations.push(duration);

            const isPortrait = production.aspectRatio === '9:16';
            const width = isPortrait ? 720 : 1280;
            const height = isPortrait ? 1280 : 720;
            const colorGrade = 'eq=brightness=0.03:contrast=1.05:saturation=1.1,vignette=PI/4';

            if (scene.imageUrl) {
                // High Speed: scale to exact dimensions first, then light zoompan
                filterComplex.push(`[${i * 2}:v]scale=${width * 1.2}:-1,zoompan=z='min(zoom+0.001,1.2)':d=${Math.ceil(duration * 25)}:s=${width}x${height},${colorGrade},setpts=PTS-STARTPTS,format=yuv420p[v${idx_to_letter(i)}]`);
            } else {
                filterComplex.push(`[${i * 2}:v]scale='if(gt(iw/ih,${width}/${height}),-1,${width})':'if(gt(iw/ih,${width}/${height}),${height},-1)',crop=${width}:${height},trim=duration=${duration},${colorGrade},setpts=PTS-STARTPTS,format=yuv420p[v${idx_to_letter(i)}]`);
            }
            filterComplex.push(`[${i * 2 + 1}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${idx_to_letter(i)}]`);
        }

        // Concatized Voice
        let voiceInputNodes = '';
        for (let i = 0; i < scenes.length; i++) voiceInputNodes += `[a${idx_to_letter(i)}]`;
        filterComplex.push(`${voiceInputNodes}concat=n=${scenes.length}:v=0:a=1[a_final]`);

        // XFade Visuals
        let currentV = `[v${idx_to_letter(0)}]`;
        let totalOffset = sceneDurations[0];
        const transDur = 0.5;
        for (let i = 1; i < scenes.length; i++) {
            const nextV = `[v${idx_to_letter(i)}]`;
            const outV = `[v_xf${i}]`;
            filterComplex.push(`${currentV}${nextV}xfade=transition=fade:duration=${transDur}:offset=${totalOffset - transDur}[v_xf${i}]`);
            currentV = outV;
            totalOffset += (sceneDurations[i] - transDur);
        }

        // Background Music
        try {
            const musicRes = await fetch(production.selectedMusic || 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a7315b.mp3');
            const musicBuffer = await musicRes.arrayBuffer();
            await ffmpeg.writeFile('bg_music.mp3', new Uint8Array(musicBuffer));
            inputs.push('-i', 'bg_music.mp3');
            const bgIdx = inputs.filter(x => x === '-i').length - 1;
            filterComplex.push(`[a_final]volume=1.5[v_loud];[${bgIdx}:a]volume=0.1,aloop=loop=-1:size=2e9,aresample=44100[bg_loop];[v_loud][bg_loop]amix=inputs=2:duration=shortest[a_mixed]`);
        } catch (e) {
            console.warn('BG Music failed, using only voice track');
            filterComplex.push(`[a_final]volume=1.5[a_mixed]`);
        }

        await ffmpeg.exec([
            ...inputs,
            '-filter_complex', filterComplex.join(';'),
            '-map', currentV,
            '-map', '[a_mixed]',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '32',
            '-c:a', 'aac',
            '-b:a', '96k',
            'output.mp4'
        ]);

        const data = await ffmpeg.readFile('output.mp4');
        return new Blob([data as any], { type: 'video/mp4' });
    } catch (err: any) {
        console.error('Render core failure:', err);
        throw err;
    } finally {
        try {
            const files = await ffmpeg.listDir('.');
            for (const f of files) {
                if (f.name !== '.' && f.name !== '..') {
                    await ffmpeg.deleteFile(f.name).catch(() => { });
                }
            }
        } catch (e) { }
    }
}

import axios from 'axios';
import { SingleBar } from 'cli-progress';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const modelUrl = 'https://huggingface.co/fancyfeast/joytag/resolve/main/model.onnx';
const modelPath = process.env.MODEL_PATH || 'data/model.onnx';

const megabytify = (bytes: number) => Math.round((bytes / 1024 / 1024) * 1000) / 1000;

export async function loadModel(): Promise<ArrayBuffer> {
	if (!existsSync(modelPath)) {
		console.log("Can't locate model file, downloading from HuggingFace...");

		const parent = dirname(modelPath);
		if (!existsSync(parent)) {
			mkdirSync(parent, { recursive: true });
		}

		if (process.env.https_proxy) {
			const url = new URL(process.env.https_proxy);
			if (url.protocol != 'http:') {
				throw new Error('https_proxy is set, but protocol is unsupported');
			}

			axios.defaults.proxy = {
				protocol: 'http',
				host: url.hostname,
				port: parseInt(url.port),
				auth: url.username ? { username: url.username, password: url.password } : undefined
			};
		}

		const progressBar = new SingleBar({
			format: '{bar} | {percentage}% | {value}/{total} MiB',
			barCompleteChar: '\u2588',
			barIncompleteChar: '\u2591',
			hideCursor: true
		});

		try {
			const { data, headers } = await axios({
				url: modelUrl,
				method: 'GET',
				responseType: 'stream'
			});

			const totalBytes = parseInt(headers['content-length'] as string);
			progressBar.start(megabytify(totalBytes), 0);

			const writer = data.pipe(createWriteStream(modelPath));
			let downloadedBytes = 0;

			data.on('data', (chunk: Buffer) => {
				downloadedBytes += chunk.length;
				progressBar.update(megabytify(downloadedBytes));
			});

			await new Promise<void>((resolve, reject) => {
				writer.on('finish', resolve);
				writer.on('error', reject);
				data.on('error', reject);
			});
		} finally {
			progressBar.stop();
		}
	}

	return new Uint8Array(readFileSync(modelPath)).buffer;
}

import fastifyMultipart from '@fastify/multipart';
import { configDotenv } from 'dotenv';
import fastify from 'fastify';
import { readFileSync } from 'node:fs';
import ort from 'onnxruntime-node';
import { loadModel } from './util/model-loader.ts';

configDotenv({
	quiet: true
});

let modelData: ArrayBuffer;
const start = performance.now();
try {
	modelData = await loadModel();
} catch (err) {
	console.error('Failed to load model!', err);
	process.exit(1);
}

export const session = await ort.InferenceSession.create(modelData, {
	executionProviders: ['cpu']
});

console.log('Loaded model from', process.env.MODEL_PATH, 'in', (performance.now() - start).toFixed(2), 'miliseconds');

export let topTags: string[];
try {
	topTags = readFileSync(process.env.TOP_TAGS_PATH, 'utf-8')
		.split('\n')
		.map(it => it.trim())
		.filter(Boolean);
} catch (err) {
	console.error('Failed to load top tags!', err);
	process.exit(1);
}

console.log('Loaded top tags from', process.env.TOP_TAGS_PATH);

const app = fastify({
	logger: true,
	bodyLimit: parseInt(process.env.MAX_FILE_SIZE) * 1024 * 1024 + 2048 // Increase body limit slightly to allow for multipart boundaries
});

await app.register(fastifyMultipart, {
	limits: {
		fileSize: parseInt(process.env.MAX_FILE_SIZE) * 1024 * 1024
	}
});

(async () => {
	const apiHandlers = ['process'];
	for (let handler of apiHandlers) {
		(await import('./api-handlers/' + handler + '.ts')).default(app);
	}

	app.addHook('onRequest', async (req, res) => {
		if (process.env.AUTH_TOKEN && req.headers.authorization != `Bearer ${process.env.AUTH_TOKEN}`) {
			return res.code(401).send({ error: 'Unauthorized' });
		}
	});

	await app.listen({
		host: process.env.ADDR,
		port: parseInt(process.env.PORT)
	});
})();

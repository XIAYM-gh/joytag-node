import type { FastifyInstance } from 'fastify';
import ort from 'onnxruntime-node';
import sharp from 'sharp';
import { session, topTags } from '../index.ts';

const FIXED_IMG_SIZE = 448;
const FIXED_IMG_PIXELS = Math.pow(FIXED_IMG_SIZE, 2);

export default (app: FastifyInstance) => {
	app.post('/process', async (req, res) => {
		let file: Buffer;
		let threshold = 0.4;
		for await (let part of req.parts()) {
			if (part.type == 'file') {
				file = await part.toBuffer();
				continue;
			}

			if (part.type == 'field' && part.fieldname == 'threshold') {
				threshold = parseFloat(part.value.toString());
			}
		}

		if (!file) {
			return res.status(400).send({ error: 'No file provided' });
		}

		const start = performance.now();

		const { data: imageBuffer } = await sharp(file)
			.resize(FIXED_IMG_SIZE, FIXED_IMG_SIZE, { fit: 'fill' })
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		const floatData = new Float32Array(3 * FIXED_IMG_PIXELS);
		const mean = [0.48145466, 0.4578275, 0.40821073];
		const std = [0.26862954, 0.26130258, 0.27577711];
		for (let i = 0; i < FIXED_IMG_PIXELS; i++) {
			const r = imageBuffer[i * 3] / 255.0;
			const g = imageBuffer[i * 3 + 1] / 255.0;
			const b = imageBuffer[i * 3 + 2] / 255.0;

			floatData[i] = (r - mean[0]) / std[0]; // R channel
			floatData[FIXED_IMG_PIXELS + i] = (g - mean[1]) / std[1]; // G channel
			floatData[2 * FIXED_IMG_PIXELS + i] = (b - mean[2]) / std[2]; // B channel
		}

		const tensor = new ort.Tensor('float32', floatData, [1, 3, 448, 448]);
		const feeds: Record<string, ort.Tensor> = {};
		feeds[session.inputNames[0]] = tensor;

		const results = await session.run(feeds);
		const logits = results[session.outputNames[0]].data as unknown as number[];

		const finalResults = [];
		for (let i = 0; i < logits.length; i++) {
			const prob = 1 / (1 + Math.exp(-logits[i]));
			if (prob >= threshold && topTags[i]) {
				finalResults.push({ tag: topTags[i], prob: prob });
			}
		}

		return {
			results: finalResults.sort((a, b) => b.prob - a.prob),
			processingTime: performance.now() - start
		};
	});
};

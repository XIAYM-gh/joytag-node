# joytag-node

Simplist ONNXRuntime + Fastify implementation in TypeScript for serving JoyTag. Possibly not the best solution.

## Requirements

- NodeJS 25 or higher
- Global `pnpm` installation
- A neat network connection

## Running

Firstly, install the dependencies using:

```bash
pnpm i
```

Then, copy the `.env.example` file to `.env` and edit it to suit your needs:

```bash
cp .env.example .env
vim .env
```

Finally, start the server using:

```bash
pnpm start
```

## API

For authorization (if set), please use the `Authorization: Bearer <TOKEN>` header.

- `POST /process`
  - Accepts multipart form data with params:
    - `file`:
      - Type: `MultipartFile`
      - Description: The image to process
    - (Optional) `threshold`:
      - Type: `number` or `string`
      - Default: `0.4`
      - Description: The tags filtering threshold
  - Returns a JSON object with the following structure:
    - `results`: `Array<{ tag: string, prob: number }>`
    - `processingTime`: `number`

## About the patch

A patch is applied to the onnxruntime-node package to support newer NodeJS versions (the original downloading part isn't handling redirects properly).

## Issues while downloading model

Try using a proxy (by setting environment variable `https_proxy`) and running manually with a TTY interface first.

If you are still having issues while downloading the model, you can manually download it ([download link](https://huggingface.co/fancyfeast/joytag/resolve/main/model.onnx)) and put it in the `data` folder.

## Want lower disk usage and better performance?

Try [joytag-onnx-Q8_0-quantized](https://huggingface.co/IamTheStormThatIsApproaching/joytag-onnx-Q8_0-quantized), a model quantized by me. It achieves ~10% better performance, uses merely 88MiB disk space and requires 200MiB less RAM. 

To use, just download the `joytag-Q8_0.onnx`, rename it as `model.onnx` and move it into the `data` folder.

But be aware of the precision loss, though it's not obvious.

## License

This project is licensed under MIT License ([Full Text Here](/LICENSE)).

The JoyTag model is licensed under Apache-2.0 License.

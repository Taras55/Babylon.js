import { NativeDataStream, NativeData } from "./nativeDataStream";

declare var _native: any;

export class ValidatedNativeDataStream extends NativeDataStream {
    constructor () {
        super();
    }

    public override writeUint8(value: number): void {
        super.writeUint32(_native.NativeDataStream.VALIDATION_UINT_8);
        super.writeUint8(value);
    }

    public override writeUint32(value: number): void {
        super.writeUint32(_native.NativeDataStream.VALIDATION_UINT_32);
        super.writeUint32(value);
    }

    public override writeInt32(value: number): void {
        super.writeUint32(_native.NativeDataStream.VALIDATION_INT_32);
        super.writeInt32(value);
    }

    public override writeFloat32(value: number): void {
        super.writeUint32(_native.NativeDataStream.VALIDATION_FLOAT_32);
        super.writeFloat32(value);
    }

    public override writeUint32Array(values: Uint32Array): void {
        super.writeUint32(_native.NativeDataStream.VALIDATION_UINT_32_ARRAY);
        super.writeUint32Array(values);
    }

    public override writeInt32Array(values: Int32Array): void {
        super.writeUint32(_native.NativeDataStream.VALIDATION_INT_32_ARRAY);
        super.writeInt32Array(values);
    }

    public override writeFloat32Array(values: Float32Array): void {
        super.writeUint32(_native.NativeDataStream.VALIDATION_FLOAT_32_ARRAY);
        super.writeFloat32Array(values);
    }

    public override writeNativeData(handle: NativeData) {
        super.writeUint32(_native.NativeDataStream.VALIDATION_NATIVE_DATA);
        super.writeNativeData(handle);
    }

    public override writeBoolean(value: boolean) {
        super.writeUint32(_native.NativeDataStream.VALIDATION_BOOLEAN);
        super.writeBoolean(value);
    }
}
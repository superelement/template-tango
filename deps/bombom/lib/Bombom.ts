
import boms = require('./boms');
import Logger = require('./Logger');


class Bombom extends Logger {

	register(type: string, signature: number[]) {
		if (this.isRegistered(type)) {
			this.warn('BOM type "' + type + '" is already registered' +
				' and will be overridden');
		}
		boms[type] = new Buffer(signature);
	}

	unregister(type: string) {
		if (!this.isRegistered(type)) {
			this.warn('No BOM type "' + type + '" to unregister');
		} else {
			delete boms[type];
		}
	}

	isRegistered(type: string) {
		return typeof boms[type] !== 'undefined';
	}

	enforce(buffer: NodeBuffer, type: string) {
		if (!this.ensureRegisteredType(type)) {
			return buffer;
		}
		var detectedType = this.detect(buffer);
		if (detectedType === type) {
			return buffer;
		}
		var detectedSignature = boms[detectedType] || new Buffer(0);
		return this.replaceSignature(buffer, detectedSignature, boms[type]);
	}

	private ensureRegisteredType(type: string) {
		if (this.isRegistered(type)) {
			return true;
		}
		this.error(new Error('BOM type "' + type + '" is not registered'));
		return false;
	}

	detect(buffer: NodeBuffer) {
		var types = Object.keys(boms);
		for (var i = 0; i < types.length; i++) {
			var type = types[i];
			if (this.isSignedWithType(buffer, type)) {
				return type;
			}
		}
		return void(0);
	}

	private isSignedWithType(buffer: NodeBuffer, type: string): boolean {
		if (!this.ensureRegisteredType(type)) {
			return void(0);
		}
		var signature = boms[type];
		for (var i = 0; i < signature.length; i++) {
			var hex = signature[i];
			if (buffer[i] !== hex) {
				return false;
			}
		}
		return true;
	}

	private replaceSignature(buffer: NodeBuffer, oldSig: NodeBuffer,
		newSig: NodeBuffer) {

		var result = new Buffer(buffer.length - oldSig.length + newSig.length);
		newSig.copy(result);
		buffer.copy(result, newSig.length);
		return result;
	}

	strip(buffer: NodeBuffer, type?: string) {
		var signature:any = null;
		if (!type) {
			signature = boms[this.detect(buffer)];
		} else if (this.isSigned(buffer, type)) {
			signature = boms[type];
		}
		if (!signature) {
			return buffer;
		}
		return buffer.slice(signature.length);
	}

	isSigned(buffer: NodeBuffer, type?: string): boolean {
		if (type && this.ensureRegisteredType(type)) {
			return this.isSignedWithType(buffer, type);
		}
		var keys = Object.keys(boms);
		for (var i = 0; i < keys.length; i++) {
			if (this.isSignedWithType(buffer, keys[i])) {
				return true;
			}
		}
		return false;
	}

}

export default Bombom;

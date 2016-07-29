/// <reference path="../typings/dt-node/node.d.ts" />
import events = require('events');


class Logger extends events.EventEmitter {

	info(message: string) {
		this.emit('info', message);
	}

	debug(message: string) {
		this.emit('debug', message);
	}

	warn(message: string) {
		this.emit('warn', message);
	}

	error(err: Error) {
		this.emit('error', err);
	}

}

export = Logger;

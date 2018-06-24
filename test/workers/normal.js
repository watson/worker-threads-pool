'use strict'

const assert = require('assert')
const {parentPort, workerData} = require('worker_threads')

assert.equal(workerData, 'hello from main')
parentPort.postMessage('hello from worker')

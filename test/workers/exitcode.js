'use strict'

const assert = require('assert')
const {workerData} = require('worker_threads')

assert.equal(workerData, 'hello from main')
process.exit(42)

'use strict'

const {workerData} = require('worker_threads')

const delay = Number.parseInt(workerData)

setTimeout(function () {}, delay)

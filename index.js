'use strict'

const {Worker} = require('worker_threads')
const {AsyncResource} = require('async_hooks')
const afterAll = require('after-all')

const noop = function () {}

module.exports = class Pool {
  constructor (opts) {
    opts = opts || {}
    this._workers = new Set()
    this._queue = []
    this._max = opts.max || 1
    this._maxWaiting = opts.maxWaiting || Infinity
  }

  get size () {
    return this._workers.size
  }

  acquire (filename, opts, cb) {
    if (typeof opts === 'function') return this.acquire(filename, undefined, opts)
    if (this._workers.size === this._max) {
      if (this._queue.length === this._maxWaiting) {
        process.nextTick(cb.bind(null, new Error('Pool queue is full')))
        return
      }
      this._queue.push(new QueuedWorkerThread(this, filename, opts, cb))
      return
    }

    const self = this

    const worker = new Worker(filename, opts)
    worker.once('error', done)
    worker.once('exit', done)

    this._workers.add(worker)

    process.nextTick(cb.bind(null, null, worker))

    function done () {
      self._workers.delete(worker)
      worker.removeListener('error', done)
      worker.removeListener('exit', done)
      const resource = self._queue.shift()
      if (resource) resource.addToPool()
    }
  }

  destroy (cb = noop) {
    const next = afterAll(cb)
    for (let worker of this._workers) {
      worker.terminate(next())
    }
  }
}

class QueuedWorkerThread extends AsyncResource {
  constructor (pool, filename, opts, cb) {
    super('worker-threads-pool:enqueue')
    this.pool = pool
    this.filename = filename
    this.opts = opts
    this.cb = cb
  }

  addToPool () {
    this.pool.acquire(this.filename, this.opts, (err, worker) => {
      this.runInAsyncScope(this.cb, null, err, worker)
    })
  }
}

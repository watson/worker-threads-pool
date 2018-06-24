'use strict'

const path = require('path')
const asyncHooks = require('async_hooks')
const test = require('tape')
const Pool = require('../')

const HANG = path.resolve(path.join('test', 'workers', 'hang.js'))
const NORMAL = path.resolve(path.join('test', 'workers', 'normal.js'))
const EXITCODE = path.resolve(path.join('test', 'workers', 'exitcode.js'))
const THROW = path.resolve(path.join('test', 'workers', 'throw.js'))

test('pool.size', function (t) {
  let count = 0
  const pool = new Pool({max: 10})
  const opts = {workerData: 1000} // hang for 1000ms

  t.equal(pool.size, 0, 'should be 0 before any call to acquire')
  count++
  pool.acquire(HANG, opts, function (worker) {
    t.equal(pool.size, 1, 'should be 1 when 1st worker have been created')
    worker.on('exit', onExit)
    count++
    pool.acquire(HANG, opts, function (worker) {
      t.equal(pool.size, 2, 'should be 2 when 2nd worker have been created')
      worker.on('exit', onExit)
      count++
      pool.acquire(HANG, opts, function (worker) {
        t.equal(pool.size, 3, 'should be 3 when 3rd worker have been created')
        worker.on('exit', onExit)
      })
      t.equal(pool.size, 3, 'should be 3 after 2rd call to acquire')
    })
    t.equal(pool.size, 2, 'should be 2 after 2nd call to acquire')
  })
  t.equal(pool.size, 1, 'should be 1 after 1st call to acquire')

  function onExit () {
    t.equal(pool.size, --count, 'should count down on exit')
    if (count === 0) t.end()
  }
})

test('pool max size - serial', function (t) {
  let count = 0
  let exits = 0
  const pool = new Pool({max: 2})
  const opts = {workerData: 1000} // hang for 1000ms

  t.equal(pool.size, 0, 'should be 0 before any call to acquire')
  count++
  pool.acquire(HANG, opts, function (worker) {
    t.equal(pool.size, 1, 'should be 1 when 1st worker have been created')
    worker.on('exit', onExit)
    count++
    pool.acquire(HANG, opts, function (worker) {
      t.equal(exits, 0, 'should have experienced 0 exits')
      t.equal(pool.size, 2, 'should be 2 when 2nd worker have been created')
      worker.on('exit', onExit)
      count++
      pool.acquire(HANG, opts, function (worker) {
        t.equal(exits, 1, 'should have experienced 1 exit')
        t.equal(pool.size, 2, 'should be 2 when 3rd worker have been created')
        worker.on('exit', onExit)
      })
      t.equal(pool.size, 2, 'should be 2 after 2rd call to acquire')
    })
    t.equal(pool.size, 2, 'should be 2 after 2nd call to acquire')
  })
  t.equal(pool.size, 1, 'should be 1 after 1st call to acquire')

  function onExit () {
    exits++
    t.equal(pool.size, --count, 'should count down on exit')
    if (count === 0) t.end()
  }
})

test('pool max size - parallel', function (t) {
  let count = 0
  let exits = 0
  const pool = new Pool({max: 2})
  const opts = {workerData: 1000} // hang for 1000ms

  t.equal(pool.size, 0, 'should be 0 before any call to acquire')
  count++
  pool.acquire(HANG, opts, function (worker) {
    t.equal(exits, 0, 'should have experienced 0 exits')
    worker.on('exit', onExit)
  })

  t.equal(pool.size, 1, 'should be 1 before 2nd call to acquire')
  count++
  pool.acquire(HANG, opts, function (worker) {
    t.equal(exits, 0, 'should have experienced 0 exits')
    worker.on('exit', onExit)
  })

  t.equal(pool.size, 2, 'should be 2 before 3rd call to acquire')
  count++
  pool.acquire(HANG, opts, function (worker) {
    t.equal(exits, 1, 'should have experienced 1 exit')
    t.equal(pool.size, 2, 'should be 2 when last worker have been created')
    worker.on('exit', onExit)
  })

  t.equal(pool.size, 2, 'should be 2 after 3rd call to acquire')

  function onExit () {
    exits++
    t.equal(pool.size, --count, 'should count down on exit')
    if (count === 0) t.end()
  }
})

test('pool max size - default', function (t) {
  let exists = 2
  const pool = new Pool()
  const opts = {workerData: 1000} // hang for 1000ms

  pool.acquire(HANG, opts, function (worker) {
    worker.on('exit', onExit)
  })
  pool.acquire(HANG, opts, function (worker) {
    worker.on('exit', onExit)
  })
  t.equal(pool.size, 1, 'should be 1 after 2nd call to acquire')

  function onExit () {
    if (--exists === 0) t.end()
  }
})

test('normal', function (t) {
  t.plan(2)
  const pool = new Pool()
  const opts = {workerData: 'hello from main'}
  pool.acquire(NORMAL, opts, function (worker) {
    worker.on('message', function (msg) {
      t.equal(msg, 'hello from worker')
    })
    worker.on('error', function (err) {
      t.error(err)
    })
    worker.on('exit', function (code) {
      t.equal(code, 0)
      t.end()
    })
  })
})

test('exit code', function (t) {
  t.plan(1)
  const pool = new Pool()
  pool.acquire(EXITCODE, function (worker) {
    worker.on('message', function (msg) {
      t.fail('should not send message')
    })
    worker.on('error', function (err) {
      t.error(err)
    })
    worker.on('exit', function (code) {
      t.equal(code, 42)
      t.end()
    })
  })
})

test('throw', function (t) {
  t.plan(2)
  const pool = new Pool()
  pool.acquire(THROW, function (worker) {
    worker.on('message', function (msg) {
      t.fail('should not send message')
    })
    worker.on('error', function (err) {
      t.equal(err.message, 'boom!')
    })
    worker.on('exit', function (code) {
      t.equal(code, 0)
      t.end()
    })
  })
})

test('pool.destroy()', function (t) {
  t.plan(3)
  const pool = new Pool({max: 10})
  const opts = {workerData: 1e6} // hang for a loooong time
  pool.acquire(HANG, opts, function (worker) {
    worker.on('exit', function (code) {
      t.equal(code, 1)
    })
    worker.on('online', function () {
      pool.acquire(HANG, opts, function (worker) {
        worker.on('exit', function (code) {
          t.equal(code, 1)
        })
        worker.on('online', function () {
          pool.destroy()
          setTimeout(function () {
            t.equal(pool.size, 0)
            t.end()
          }, 1000)
        })
      })
    })
  })
})

test('pool.destroy(callback)', function (t) {
  t.plan(2)
  const pool = new Pool({max: 10})
  const opts = {workerData: 1000} // hang for 1000ms
  pool.acquire(HANG, opts, function (worker) {
    worker.on('exit', function (code) {
      t.equal(code, 1)
    })
    worker.on('online', function () {
      pool.acquire(HANG, opts, function (worker) {
        worker.on('exit', function (code) {
          t.equal(code, 1)
        })
        worker.on('online', function () {
          pool.destroy(function () {
            t.end()
          })
        })
      })
    })
  })
})

test('async_hooks', function (t) {
  t.plan(2)

  class Context extends Map {
    get current () {
      const asyncId = asyncHooks.executionAsyncId()
      return this.has(asyncId) ? this.get(asyncId) : null
    }
    set current (val) {
      const asyncId = asyncHooks.executionAsyncId()
      this.set(asyncId, val)
    }
  }
  const context = new Context()

  const hook = asyncHooks.createHook({
    init (asyncId, type, triggerAsyncId, resource) {
      context.set(asyncId, context.current)
    },
    destroy (asyncId) {
      context.delete(asyncId)
    }
  })
  hook.enable()

  let workers = 2
  const pool = new Pool() // max 1 worker at a time
  const opts = {workerData: 1000} // hang for 1000ms

  context.current = 1
  pool.acquire(HANG, opts, function (worker) {
    t.equal(context.current, 1)
    worker.on('exit', onExit)
  })
  context.current = 2
  pool.acquire(HANG, opts, function (worker) {
    t.equal(context.current, 2)
    worker.on('exit', onExit)
  })

  function onExit () {
    if (--workers === 0) t.end()
  }
})

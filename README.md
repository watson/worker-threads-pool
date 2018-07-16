# worker-threads-pool

Easily manage a pool of [Node.js Worker
Threads](https://nodejs.org/api/worker_threads.html).

[![npm](https://img.shields.io/npm/v/worker-threads-pool.svg)](https://www.npmjs.com/package/worker-threads-pool)
[![Build status](https://travis-ci.org/watson/worker-threads-pool.svg?branch=master)](https://travis-ci.org/watson/worker-threads-pool)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Installation

```
npm install worker-threads-pool --save
```

## Prerequisites

Worker Threads in Node.js are still an experimental feature and is only
supported in Node.js v10.5.0 and above. To use Worker Threads, you need
to run `node` with the `--experimental-worker` flag:

```
node --experimental-worker app.js
```

## Usage

```js
const Pool = require('worker-threads-pool')

const pool = new Pool({max: 5})

for (let i = 0; i < 100; i++) {
  pool.acquire('/my/worker.js', function (err, worker) {
    if (err) throw err
    console.log(`started worker ${i} (pool size: ${pool.size})`)
    worker.on('exit', function () {
      console.log(`worker ${i} exited (pool size: ${pool.size})`)
    })
  })
}
```

## API

### `pool = new Pool([options])`

`options` is an optional object/dictionary with the any of the following properties:

- `max` - Maximum number of workers allowed in the pool. Other workers
  will be queued and started once there's room in the pool (default:
  `1`)
- `maxWaiting` - Maximum number of workers waiting to be started when
  the pool is full. The callback to `pool.acquire` will be called with
  an error in case this limit is reached

### `pool.size`

Number of active workers in the pool.

### `pool.acquire(filename[, options], callback)`

The `filename` and `options` arguments are passed directly to [`new
Worker(filename,
options)`](https://nodejs.org/api/worker_threads.html#worker_threads_new_worker_filename_options).

The `callback` argument will be called with the an optional error object
and the worker once it's created.

### `pool.destroy([callback])`

Calls
[`worker.terminate()`](https://nodejs.org/api/worker_threads.html#worker_threads_worker_terminate_callback)
on all workers in the pool.

Will call the optional `callback` once all workers have terminated.

## License

[MIT](https://github.com/watson/worker-threads-pool/blob/master/LICENSE)

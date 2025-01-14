declare interface ReadableStream<R = unknown> extends AsyncIterable<R> {
    values(options?: ReadableStreamIteratorOptions): AsyncIterator<R>
    [Symbol.asyncIterator](options?: ReadableStreamIteratorOptions): AsyncIterator<R>
  }
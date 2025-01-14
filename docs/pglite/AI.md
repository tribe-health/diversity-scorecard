
### Indexed DB

```ts
/**
 * Opens an `IndexedDB` database via a `Promise`.
 *
 * If the database doesn't exist, `handleUpgrade` will
 * be called. Use this to create object stores.
 */
export async function openDB(
  name: string,
  version?: number,
  handleUpgrade?: (db: IDBDatabase) => void
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version)

    request.onupgradeneeded = () => {
      handleUpgrade?.(request.result)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

/**
 * Counts all objects in an `IndexedDB` object store.
 */
export async function countObjects<T>(db: IDBDatabase, storeName: string) {
  const transaction = db.transaction(storeName, 'readonly')
  const store = transaction.objectStore(storeName)
  const countRequest = store.count()

  return await new Promise<number>((resolve, reject) => {
    countRequest.onsuccess = () => {
      resolve(countRequest.result)
    }
    countRequest.onerror = () => {
      reject(countRequest.error)
    }
  })
}

/**
 * Lists all objects in an `IndexedDB` object store
 * (key and value) via an `AsyncIterable` stream.
 */
export async function* listObjects<T>(
  db: IDBDatabase,
  storeName: string
): AsyncIterable<{ key: IDBValidKey; value: T }> {
  const transaction = db.transaction(storeName, 'readonly')
  const store = transaction.objectStore(storeName)

  // List all keys, then asynchronously yield each one.
  // Note IndexedDB also offers cursors, but these don't work
  // in this context since IDB transactions close at the end
  // of each event loop, and we yield asynchronously
  const keysRequest = store.getAllKeys()
  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    keysRequest.onsuccess = () => {
      resolve(keysRequest.result)
    }
    keysRequest.onerror = () => {
      reject(keysRequest.error)
    }
  })

  for (const key of keys) {
    // Transactions auto-close at the end of each event loop,
    // so we need to create a new one each iteration
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)

    const valueRequest: IDBRequest<T> = store.get(key)
    const value = await new Promise<T>((resolve, reject) => {
      valueRequest.onsuccess = () => {
        resolve(valueRequest.result)
      }
      valueRequest.onerror = () => {
        reject(valueRequest.error)
      }
    })

    yield { key, value }
  }
}

/**
 * Check if an object in an `IndexedDB` object store exists.
 */
export async function hasObject(store: IDBObjectStore, query: IDBValidKey) {
  return new Promise<boolean>((resolve, reject) => {
    const getKeyRequest = store.getKey(query)

    getKeyRequest.onsuccess = () => {
      resolve(getKeyRequest.result !== undefined)
    }

    getKeyRequest.onerror = () => {
      reject(getKeyRequest.error)
    }
  })
}

/**
 * Retrieves an object in an `IndexedDB` object store
 * via a `Promise`.
 */
export async function getObject<T>(store: IDBObjectStore, query: IDBValidKey) {
  return new Promise<T>((resolve, reject) => {
    const getRequest = store.get(query)

    getRequest.onsuccess = () => {
      resolve(getRequest.result)
    }

    getRequest.onerror = () => {
      reject(getRequest.error)
    }
  })
}

/**
 * Retrieves an object in an `IndexedDB` object store
 * via a `Promise`.
 */
export async function putObject<T>(store: IDBObjectStore, query: IDBValidKey, value: T) {
  return new Promise<void>((resolve, reject) => {
    const putRequest = store.put(value, query)

    putRequest.onsuccess = () => {
      resolve()
    }

    putRequest.onerror = () => {
      reject(putRequest.error)
    }
  })
}
```

### Hooks

```ts
'use client'

import { generateId } from 'ai'
import { Chart } from 'chart.js'
import { codeBlock } from 'common-tags'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  cloneElement,
  isValidElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '~/components/app-provider'
import { useDatabaseUpdateMutation } from '~/data/databases/database-update-mutation'
import { useTablesQuery } from '~/data/tables/tables-query'
import { embed } from './embed'
import { loadFile, saveFile } from './files'
import { SmoothScroller } from './smooth-scroller'
import { maxRowLimit, OnToolCall } from './tools'

export function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export type UseAutoScrollProps = {
  enabled?: boolean
}

/**
 * Automatically scroll a container to the bottom as new
 * content is added to it.
 */
export function useAutoScroll({ enabled = true }: UseAutoScrollProps = {}) {
  // Store container element in state so that we can
  // mount/dismount handlers via `useEffect` (see below)
  const [container, setContainer] = useState<HTMLDivElement>()

  const scroller = useMemo(() => {
    if (container) {
      return new SmoothScroller(container)
    }
  }, [container])

  // Maintain `isSticky` state for the consumer to access
  const [isSticky, setIsSticky] = useState(true)

  // Maintain `isStickyRef` value for internal use
  // that isn't limited to React's state lifecycle
  const isStickyRef = useRef(isSticky)

  const ref = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      setContainer(element)
    }
  }, [])

  // Convenience function to allow consumers to
  // scroll to the bottom of the container
  const scrollToEnd = useCallback(() => {
    if (container && scroller) {
      isStickyRef.current = true

      // Update state so that consumers can hook into sticky status
      setIsSticky(isStickyRef.current)

      // TODO: support duration greater than 0
      scroller.scrollTo(container.scrollHeight - container.clientHeight, 0)
    }
  }, [container, scroller])

  useEffect(() => {
    let resizeObserver: ResizeObserver | undefined
    let mutationObserver: MutationObserver | undefined
    let lastScrollTop: number
    let lastScrollHeight: number

    function onScrollStart(e: Event) {
      if (container && scroller) {
        // TODO: understand where these phantom scroll/height changes occur
        if (lastScrollHeight !== undefined && container.scrollHeight !== lastScrollHeight) {
          return
        }

        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight
        const hasScrolledUp = container.scrollTop < lastScrollTop

        if (hasScrolledUp) {
          scroller.cancel()
        }

        // We're sticky if we're in the middle of an automated scroll
        // or if the user manually scrolled to the bottom
        isStickyRef.current = !hasScrolledUp && (scroller.isAnimating || isAtBottom)

        // Update state so that consumers can hook into sticky status
        setIsSticky(isStickyRef.current)
      }
    }

    if (container) {
      container.addEventListener('scroll', onScrollStart)

      if (enabled) {
        // Scroll when the container's children resize
        resizeObserver = new ResizeObserver(() => {
          lastScrollTop = container.scrollTop
          lastScrollHeight = container.scrollHeight

          if (isStickyRef.current) {
            scrollToEnd()
          }
        })

        // Monitor the size of the children within the scroll container
        for (const child of Array.from(container.children)) {
          resizeObserver.observe(child)
        }
      }
    }

    return () => {
      container?.removeEventListener('scroll', onScrollStart)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [container, scroller, scrollToEnd, enabled])

  return { ref, isSticky, scrollToEnd }
}

export function useAsyncMemo<T>(
  asyncFunction: () => Promise<T>,
  dependencies: React.DependencyList,
  initialValue: T | undefined = undefined
) {
  const [value, setValue] = useState<T | undefined>(initialValue)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(true)

  const hasBeenCancelled = useRef(false)

  useEffect(() => {
    hasBeenCancelled.current = false
    setLoading(true)

    asyncFunction()
      .then((result) => {
        if (!hasBeenCancelled.current) {
          setValue(result)
          setError(undefined)
        }
      })
      .catch((err) => {
        if (!hasBeenCancelled.current) {
          setValue(undefined)
          setError(err)
        }
      })
      .finally(() => {
        if (!hasBeenCancelled.current) {
          setLoading(false)
        }
      })

    return () => {
      hasBeenCancelled.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { value, error, loading }
}

export function useOnToolCall(databaseId: string) {
  const { dbManager } = useApp()
  const { refetch: refetchTables } = useTablesQuery({
    databaseId,
    schemas: ['public', 'meta'],
  })
  const { mutateAsync: updateDatabase } = useDatabaseUpdateMutation()

  const { value: vectorDataTypeId } = useAsyncMemo(async () => {
    if (!dbManager) {
      throw new Error('dbManager is not available')
    }
    const db = await dbManager.getDbInstance(databaseId)
    const sql = codeBlock`
      select
        typname,
        oid
      from
        pg_type
      where
        typname = 'vector';
    `

    const result = await db.query<{ oid: number }>(sql)
    const [{ oid }] = result.rows

    return oid
  }, [dbManager, databaseId])

  return useCallback<OnToolCall>(
    async ({ toolCall }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }
      const db = await dbManager.getDbInstance(databaseId)

      switch (toolCall.toolName) {
        case 'getDatabaseSchema': {
          const { data: tables, error } = await refetchTables()

          // TODO: handle this error in the UI
          if (error) {
            throw error
          }

          return {
            success: true,
            tables,
          }
        }
        case 'renameConversation': {
          const { name } = toolCall.args

          try {
            await updateDatabase({ id: databaseId, name, isHidden: false })

            return {
              success: true,
              message: 'Database conversation has been successfully renamed.',
            }
          } catch (err) {
            return {
              success: false,
              message: err instanceof Error ? err.message : 'An unknown error occurred',
            }
          }
        }
        case 'brainstormReports': {
          return {
            success: true,
            message: 'Reports have been brainstormed. Relay this info to the user.',
          }
        }
        case 'executeSql': {
          try {
            const { sql } = toolCall.args

            const results = await db.exec(sql)

            const oversizedResult = results.find((result) => result.rows.length > maxRowLimit)

            // We have a max row count in place to mitigate LLM token abuse
            if (oversizedResult) {
              return {
                success: false,
                error: `Query produced ${oversizedResult.rows.length} rows but the max allowed limit is ${maxRowLimit}. Rerun the query with a limit of ${maxRowLimit}.`,
              }
            }

            // Truncate vector columns due to their large size (display purposes only)
            const filteredResults = results.map((result) => {
              const vectorFields = result.fields.filter(
                (field) => field.dataTypeID === vectorDataTypeId
              )

              return {
                ...result,
                rows: result.rows.map((row) =>
                  Object.entries(row).reduce(
                    (merged, [key, value]) => ({
                      ...merged,
                      [key]: vectorFields.some((field) => field.name === key)
                        ? `[${JSON.parse(value).slice(0, 3).join(',')},...]`
                        : value,
                    }),
                    {}
                  )
                ),
              }
            })

            const { data: tables, error } = await refetchTables()

            // TODO: handle this error in the UI
            if (error) {
              throw error
            }

            return {
              success: true,
              queryResults: filteredResults,
              updatedSchema: tables,
            }
          } catch (err) {
            if (err instanceof Error) {
              return { success: false, error: err.message }
            }
            throw err
          }
        }
        case 'generateChart': {
          // TODO: correct zod schema for Chart.js `config`
          const { config } = toolCall.args as any

          // Validate that the chart can be rendered without error
          const canvas = document.createElement('canvas', {})
          canvas.className = 'invisible'
          document.body.appendChild(canvas)

          try {
            const chart = new Chart(canvas, config)
            chart.destroy()
            return {
              success: true,
              message:
                "The chart has been generated and displayed to the user above. Acknowledge the user's request.",
            }
          } catch (err) {
            if (err instanceof Error) {
              return { success: false, error: err.message }
            }
            throw err
          } finally {
            canvas.remove()
          }
        }
        case 'importCsv': {
          const { fileId, sql } = toolCall.args

          try {
            const file = await loadFile(fileId)
            await db.exec(sql, { blob: file })
            await refetchTables()

            return {
              success: true,
              message: 'The CSV has been imported successfully.',
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unknown error has occurred',
            }
          }
        }
        case 'exportCsv': {
          const { fileName, sql } = toolCall.args
          const fileId = generateId()

          try {
            const [result] = await db.exec(sql)

            if (!result.blob) {
              return {
                success: false,
                error: 'Failed to export CSV from the database',
              }
            }

            const file = new File([result.blob], fileName, { type: 'text/csv' })
            await saveFile(fileId, file)

            return {
              success: true,
              message: 'The query as been successfully exported as a CSV. Do not link to it.',
              fileId,
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
              },
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unknown error has occurred',
            }
          }
        }
        case 'embed': {
          const { texts } = toolCall.args

          try {
            const embeddings = await embed(texts, {
              normalize: true,
              pooling: 'mean',
            })

            const sql = codeBlock`
              insert into meta.embeddings
                (content, embedding)
              values
                ${embeddings.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2})`).join(',')}
              returning
                id;
            `

            const params = embeddings.flatMap((embedding, i) => [
              texts[i],
              `[${embedding.join(',')}]`,
            ])

            const results = await db.query<{ id: number }>(sql, params)
            const ids = results.rows.map(({ id }) => id)

            return {
              success: true,
              ids,
            }
          } catch (error) {
            console.error(error)

            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unknown error has occurred',
            }
          }
        }
        case 'importSql': {
          const { fileId } = toolCall.args

          try {
            const file = await loadFile(fileId)
            await db.exec(await file.text())
            await refetchTables()

            return {
              success: true,
              message: 'The SQL file has been executed successfully.',
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unknown error has occurred',
            }
          }
        }
      }
    },
    [dbManager, refetchTables, updateDatabase, databaseId, vectorDataTypeId]
  )
}

export type UseDropZoneOptions = {
  onDrop?(files: File[]): void
  cursorElement?: ReactNode
}

export function useDropZone<T extends HTMLElement>({
  onDrop,
  cursorElement,
}: UseDropZoneOptions = {}) {
  const [element, setElement] = useState<T>()
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const ref = useCallback((element: T | null) => {
    setElement(element ?? undefined)
  }, [])

  const cursorRef = useRef<HTMLElement>(null)

  const cursor = useMemo(() => {
    if (!isDraggingOver) {
      return undefined
    }

    const clonedCursor =
      cursorElement && isValidElement<any>(cursorElement)
        ? cloneElement(cursorElement, {
            ref: cursorRef,
            style: {
              ...cursorElement.props.style,
              pointerEvents: 'none',
              position: 'fixed',
            },
          })
        : undefined

    if (!clonedCursor) {
      return undefined
    }

    return createPortal(clonedCursor, document.body)
  }, [cursorElement, isDraggingOver])

  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault()

      const items = e.dataTransfer?.items

      if (items) {
        const hasFile = Array.from(items).some((item) => item.kind === 'file')

        if (hasFile) {
          e.dataTransfer.dropEffect = 'copy'
          setIsDraggingOver(true)

          if (cursorRef.current) {
            cursorRef.current.style.left = `${e.clientX}px`
            cursorRef.current.style.top = `${e.clientY}px`
          }
        } else {
          e.dataTransfer.dropEffect = 'none'
        }
      }
    }

    function handleDragLeave() {
      setIsDraggingOver(false)
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault()
      setIsDraggingOver(false)

      const items = e.dataTransfer?.items

      if (items) {
        const files = Array.from(items)
          .map((file) => file.getAsFile())
          .filter((file): file is File => !!file)

        onDrop?.(files)
      }
    }

    if (element) {
      element.addEventListener('dragover', handleDragOver)
      element.addEventListener('dragleave', handleDragLeave)
      element.addEventListener('drop', handleDrop)
    }

    return () => {
      element?.removeEventListener('dragover', handleDragOver)
      element?.removeEventListener('dragleave', handleDragLeave)
      element?.removeEventListener('drop', handleDrop)
    }
  }, [element, cursor, onDrop])

  return { ref, element, isDraggingOver, cursor }
}

export type UseFollowMouseOptions<P extends HTMLElement> = {
  parentElement?: P
}

export function useFollowMouse<T extends HTMLElement, P extends HTMLElement>({
  parentElement,
}: UseFollowMouseOptions<P>) {
  const [element, setElement] = useState<T>()

  const ref = useCallback((element: T | null) => {
    setElement(element ?? undefined)
  }, [])

  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      if (element) {
        element.style.left = `${e.offsetX}px`
        element.style.top = `${e.offsetY}px`
      }
    }

    if (element && parentElement) {
      parentElement.addEventListener('dragover', handleDragOver)
    }

    return () => {
      parentElement?.removeEventListener('dragover', handleDragOver)
    }
  }, [element, parentElement])

  return { ref }
}

/**
 * Use a query parameter event to trigger a callback.
 *
 * Automatically removes query params from the URL.
 */
export function useQueryEvent(event: string, callback: (params: URLSearchParams) => void) {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('event') === event) {
      router.replace(window.location.pathname)
      callback(params)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, params])
}
```

### LLM Provider

```ts
const providerUrlMap = new Map([
  ['openai', 'https://api.openai.com/v1'],
  ['x-ai', 'https://api.x.ai/v1'],
  ['openrouter', 'https://openrouter.ai/api/v1'],
] as const)

type MapKeys<T> = T extends Map<infer K, any> ? K : never

export type Provider = MapKeys<typeof providerUrlMap>

export function getProviderUrl(provider: Provider) {
  const url = providerUrlMap.get(provider)

  if (!url) {
    throw new Error(`unknown provider: ${provider}`)
  }

  return url
}

export function getProviderId(apiUrl: string): Provider | undefined {
  for (const [key, value] of providerUrlMap.entries()) {
    if (value === apiUrl) {
      return key
    }
  }
}
```

### Tools

```ts
import { CoreTool } from 'ai'
import { codeBlock } from 'common-tags'
import { z } from 'zod'
import { reportSchema, resultsSchema, tableSchema } from './schema'

const successResultSchema = z.object({
  success: z.literal(true),
})

const errorResultSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

function result<T extends z.ZodTypeAny>(schema: T) {
  return z.union([z.intersection(successResultSchema, schema), errorResultSchema])
}

/**
 * The maximum SQL result row limit to prevent overloading LLM.
 */
export const maxRowLimit = 100

/**
 * The maximum number of messages from the chat history to send to the LLM.
 */
export const maxMessageContext = 30

/**
 * Central location for all LLM tools including their
 * description, arg schema, and result schema.
 *
 * Type safe utility types have been created around this object.
 */
export const tools = {
  getDatabaseSchema: {
    description:
      'Gets all table and column data within the public schema in the Postgres database.',
    args: z.object({}),
    result: result(
      z.object({
        tables: tableSchema,
      })
    ),
  },
  executeSql: {
    description:
      "Executes Postgres SQL against the user's database. Perform joins automatically. Always add limits for safety.",
    args: z.object({ sql: z.string() }),
    result: result(
      z.object({
        queryResults: z.array(resultsSchema),
      })
    ),
  },
  renameConversation: {
    description: 'Gives the conversation a short and concise name.',
    args: z.object({ name: z.string() }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  brainstormReports: {
    description: 'Brainstorms some interesting reports to show to the user.',
    args: z.object({
      reports: z.array(reportSchema),
    }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  generateChart: {
    description: codeBlock`
      Generates a chart using Chart.js for a given SQL query.
      - Label both axises
      - Plugins are not available
      - Use a variety of neon colors by default (rather than the same color for all)
      
      Call \`executeSql\` first.
    `,
    args: z.object({
      config: z
        .object({
          type: z.any(),
          data: z.any(),
          options: z.any(),
        })
        .describe(
          'The `config` passed to `new Chart(ctx, config). Includes `type`, `data`, `options`, etc.'
        ),
    }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  requestCsv: {
    description: codeBlock`
      Requests a CSV upload from the user.
    `,
    args: z.object({}),
    result: result(
      z.object({
        fileId: z.string(),
        file: z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
          lastModified: z.number(),
        }),
        preview: z.string(),
      })
    ),
  },
  importCsv: {
    description: codeBlock`
      Imports a CSV file with the specified ID into a table. Call \`requestCsv\` first.
      
      Check if any existing tables can import this or
      otherwise create new table using \`executeSql\` first.
    `,
    args: z.object({
      fileId: z.string().describe('The ID of the CSV file to import'),
      sql: z.string().describe(codeBlock`
        The Postgres COPY command to import the CSV into the table.
    
        The CSV file will be temporarily available on the server at this exact path: '/dev/blob' (use exactly as quoted)
      `),
    }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  exportCsv: {
    description: codeBlock`
      Exports a query to a CSV file.
    `,
    args: z.object({
      fileName: z.string().describe('The file name for the exported CSV file. Must end in `.csv`.'),
      sql: z.string().describe(codeBlock`
        The Postgres COPY command to export a query to a CSV.
    
        The file must always be saved on the server to this exact path: '/dev/blob' (use exactly as quoted)
      `),
    }),
    result: result(
      z.object({
        message: z.string(),
        fileId: z.string(),
        file: z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
        }),
      })
    ),
  },
  requestSql: {
    description: codeBlock`
      Requests a SQL file upload from the user.
    `,
    args: z.object({}),
    result: result(
      z.object({
        fileId: z.string(),
        file: z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
          lastModified: z.number(),
        }),
        preview: z.string(),
      })
    ),
  },
  importSql: {
    description: codeBlock`
      Executes a Postgres SQL file with the specified ID against the user's database. Call \`requestSql\` first.
    `,
    args: z.object({
      fileId: z.string().describe('The ID of the SQL file to execute'),
      sql: z.string().describe(codeBlock`
        The Postgres SQL file content to execute against the user's database.
      `),
    }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  embed: {
    description: codeBlock`
      Generates vector embeddings for texts. Use with pgvector extension.
      Semantic search and RAG are good use cases for these embeddings.

      Uses Alibaba's gte-small embedding model (because it's small).
      It generates 384 dimensions. They are normalized.

      Embeddings are stored in the meta.embeddings table and a list of IDs
      are returned for each text input. Treat this table as a staging area.
      
      Use these IDs to copy the embeddings into other tables.
    `,
    args: z.object({
      texts: z
        .array(z.string())
        .describe(
          'The array of texts to generate embeddings for. A separate embedding will be generated for each text.'
        ),
    }),
    result: result(
      z.object({
        ids: z.array(z.number()),
      })
    ),
  },
} satisfies Record<string, Tool>

export type Tools = typeof tools

export type Tool<
  Args extends z.ZodTypeAny = z.ZodTypeAny,
  Result extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  description: string
  args: Args
  result: Result
}

/**
 * Tool call from `ai` SDK.
 *
 * Duplicated since this is not exported by their lib.
 */
export type ToolCall<Name extends string, Args> = {
  toolCallId: string
  toolName: Name
  args: Args
}

/**
 * Tool result from `ai` SDK.
 *
 * Duplicated since this is not exported by their lib.
 */
export type ToolResult<Name extends string, Args, Result> = ToolCall<Name, Args> & {
  result: Result
}

/**
 * Utility function to extract the `args` Zod type from a `Tool`.
 */
export type ExtractArgs<T extends Tool> = z.infer<T['args']>

/**
 * Utility function to extract the `result` Zod type from a `Tool`.
 */
export type ExtractResult<T extends Tool> = z.infer<T['result']>

/**
 * Type safe `ToolInvocation` type based on our defined tools.
 * Can optionally pass the name of a tool to narrow the tool
 * invocation to a specific tool.
 */
export type ToolInvocation<Name extends keyof Tools = keyof Tools> = {
  [K in keyof Tools]:
    | ToolCall<K, ExtractArgs<Tools[K]>>
    | ToolResult<K, ExtractArgs<Tools[K]>, ExtractResult<Tools[K]>>
}[Name]

/**
 * Creates a union of all possible tool calls based
 * on our defined tools.
 */
export type ToolCallUnion = {
  [K in keyof Tools]: ToolCall<K & string, ExtractArgs<Tools[K]>>
}[keyof Tools]

/**
 * Type safe `onToolCall` type based on our defined tools.
 * Will correctly limit `toolCall.toolName` to the tools
 * we've defined and narrow the type when accessed in an
 * `if`/`switch` statement.
 *
 * Sadly we can not infer return type due to limitations
 * with TypeScript, so is left as `unknown`.
 */
export type OnToolCall = ({ toolCall }: { toolCall: ToolCallUnion }) => unknown

/**
 * Converts our defined tools to a object of `CoreTools` that the `ai`
 * SDK expects.
 */
export function convertToCoreTools(tools: Tools) {
  return Object.entries(tools).reduce<Record<string, CoreTool>>(
    (merged, [name, tool]) => ({
      ...merged,
      [name]: {
        description: tool.description,
        parameters: tool.args,
      },
    }),
    {}
  )
}
```


### Embedding

```ts
import { FeatureExtractionPipelineOptions } from '@xenova/transformers'
import * as Comlink from 'comlink'

type EmbedFn = (typeof import('./worker.ts'))['embed']

let embedFn: EmbedFn

// Wrap embed function in WebWorker via comlink
function getEmbedFn() {
  if (embedFn) {
    return embedFn
  }

  if (typeof window === 'undefined') {
    throw new Error('Embed function only available in the browser')
  }

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  embedFn = Comlink.wrap<EmbedFn>(worker)
  return embedFn
}

/**
 * Generates an embedding for each text in `texts`.
 *
 * @returns An array of vectors.
 */
export async function embed(texts: string[], options?: FeatureExtractionPipelineOptions) {
  const embedFn = getEmbedFn()
  return await embedFn(texts, options)
}
```

### Worker Setup Embeddings

```ts
import { FeatureExtractionPipelineOptions, pipeline } from '@xenova/transformers'
import * as Comlink from 'comlink'

const embedPromise = pipeline('feature-extraction', 'supabase/gte-small', {
  quantized: true,
})

export async function embed(
  texts: string[],
  options?: FeatureExtractionPipelineOptions
): Promise<number[][]> {
  const embedFn = await embedPromise
  const tensor = await embedFn(texts, options)
  return tensor.tolist()
}

Comlink.expose(embed)
```

### Streams

```ts
import { TarStreamFile } from '@std/tar/tar-stream'
import { TarStreamEntry } from '@std/tar/untar-stream'

export type AnyIterable<T> = Iterable<T> | AsyncIterable<T>

export async function* mergeIterables<T>(iterables: AnyIterable<AnyIterable<T>>): AsyncIterable<T> {
  for await (const iterable of iterables) {
    yield* iterable
  }
}

export function makeAsyncIterable<T>(iterator: AsyncIterator<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      return iterator
    },
  }
}

/**
 * Waits for a chunk in an `AsyncIterable` stream matching the `predicate`
 * function, then returns the chunk along with the rest of the stream.
 *
 * All chunks that arrive before the desired chunk get buffered in memory.
 * These are then re-yielded along with the remaining chunks.
 *
 * If the desired chunk was never found, `undefined` is returned in the tuple.
 */
export async function waitForChunk<T>(
  stream: AsyncIterable<T>,
  predicate: (chunk: T) => boolean
): Promise<[chunk: T | undefined, rest: AsyncIterable<T>]> {
  const iterator = stream[Symbol.asyncIterator]()
  const iterable = makeAsyncIterable(iterator)

  const buffer: T[] = []

  while (true) {
    const { value, done } = await iterator.next()
    if (done) break

    if (predicate(value)) {
      return [value, mergeIterables([buffer, iterable])]
    }

    buffer.push(value)
  }

  return [undefined, mergeIterables([buffer, iterable])]
}

/**
 * Converts a `File` into a `TarStreamFile`.
 */
export async function fileToTarStreamFile(file: File, path?: string): Promise<TarStreamFile> {
  return {
    type: 'file',
    path: path ? `${path}/${file.name}` : file.name,
    size: file.size,
    readable: file.stream(),
  }
}

/**
 * Converts a `TarStreamEntry` into a `File`.
 */
export async function tarStreamEntryToFile(tarStreamEntry: TarStreamEntry): Promise<File> {
  if (tarStreamEntry.header.typeflag !== '0') {
    throw new Error('Tar stream entry is not a file')
  }

  if (!tarStreamEntry.readable) {
    throw new Error('Tar stream entry is a file, but has no readable stream')
  }

  const fileName = tarStreamEntry.path.split('/').at(-1)!

  return await fileFromStream(tarStreamEntry.readable, fileName)
}

/**
 * Generates a `Blob` from a `ReadableStream<Uint8Array>`.
 */
export async function blobFromStream(stream: ReadableStream<Uint8Array>) {
  const response = new Response(stream)
  return await response.blob()
}

/**
 * Generates a `File` from a `ReadableStream<Uint8Array>`.
 */
export async function fileFromStream(
  stream: ReadableStream<Uint8Array>,
  fileName: string,
  options?: FilePropertyBag
) {
  const blob = await blobFromStream(stream)
  return new File([blob], fileName, options)
}

/**
 * Generates a `TransformStream` from a transform function.
 *
 * The function can be sync or async, and it's return value
 * represents the transformed value.
 */
export function transformStreamFromFn<I, O>(
  transform: (input: I) => O | Promise<O | undefined> | undefined
) {
  return new TransformStream<I, O>({
    async transform(chunk, controller) {
      try {
        const output = await transform(chunk)
        if (output) {
          controller.enqueue(output)
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

/**
 * Generates a `ReadableStream` from an `Iterable` or `AsyncIterable`.
 *
 * Useful for converting generator functions into readable streams.
 */
export function readableStreamFromIterable<T>(iterable: AnyIterable<T>) {
  const iterator =
    Symbol.asyncIterator in iterable
      ? iterable[Symbol.asyncIterator]()
      : iterable[Symbol.iterator]()

  return new ReadableStream<T>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
```

### Chat UI

```tsx
'use client'

import { Message, generateId } from 'ai'
import { useChat } from 'ai/react'
import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, ArrowDown, ArrowUp, Flame, Paperclip, PlugIcon, Square } from 'lucide-react'
import {
  FormEventHandler,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { TablesData } from '~/data/tables/tables-query'
import { saveFile } from '~/lib/files'
import { useAutoScroll, useDropZone } from '~/lib/hooks'
import { requestFileUpload } from '~/lib/util'
import { cn } from '~/lib/utils'
import { AiIconAnimation } from './ai-icon-animation'
import { useApp } from './app-provider'
import ByoLlmButton from './byo-llm-button'
import ChatMessage from './chat-message'
import { CopyableField } from './copyable-field'
import SignInButton from './sign-in-button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useWorkspace } from './workspace'

export function getInitialMessages(tables: TablesData): Message[] {
  return [
    // An artificial tool call containing the DB schema
    // as if it was already called by the LLM
    {
      id: generateId(),
      role: 'assistant',
      content: '',
      toolInvocations: [
        {
          state: 'result',
          toolCallId: generateId(),
          toolName: 'getDatabaseSchema',
          args: {},
          result: tables,
        },
      ],
    },
  ]
}

export default function Chat() {
  const {
    user,
    isLoadingUser,
    focusRef,
    setIsSignInDialogOpen,
    isRateLimited,
    liveShare,
    modelProvider,
    modelProviderError,
    setIsModelProviderDialogOpen,
  } = useApp()
  const [inputFocusState, setInputFocusState] = useState(false)

  const {
    databaseId,
    isLoadingMessages,
    isLoadingSchema,
    isConversationStarted,
    messages,
    appendMessage,
    stopReply,
  } = useWorkspace()

  const { input, setInput, isLoading } = useChat({
    id: databaseId,
    api: '/api/chat',
  })

  const { ref: scrollRef, isSticky, scrollToEnd } = useAutoScroll()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nextMessageId = useMemo(() => generateId(), [messages.length])

  const sendCsv = useCallback(
    async (file: File) => {
      const fileId = generateId()

      await saveFile(fileId, file)

      const text = await file.text()

      // Add an artificial tool call requesting the CSV
      // with the file result all in one operation.
      appendMessage({
        role: 'assistant',
        content: '',
        toolInvocations: [
          {
            state: 'result',
            toolCallId: generateId(),
            toolName: 'requestCsv',
            args: {},
            result: {
              success: true,
              fileId: fileId,
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
              },
              preview: text.split('\n').slice(0, 4).join('\n').trim(),
            },
          },
        ],
      })
    },
    [appendMessage]
  )

  const sendSql = useCallback(
    async (file: File) => {
      const fileId = generateId()

      await saveFile(fileId, file)

      const text = await file.text()

      // Add an artificial tool call requesting the CSV
      // with the file result all in one operation.
      appendMessage({
        role: 'assistant',
        content: '',
        toolInvocations: [
          {
            state: 'result',
            toolCallId: generateId(),
            toolName: 'requestSql',
            args: {},
            result: {
              success: true,
              fileId: fileId,
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
              },
              preview: text.split('\n').slice(0, 10).join('\n').trim(),
            },
          },
        ],
      })
    },
    [appendMessage]
  )

  const {
    ref: dropZoneRef,
    isDraggingOver,
    cursor: dropZoneCursor,
  } = useDropZone({
    async onDrop(files) {
      if (isAuthRequired) {
        return
      }

      const [file] = files

      if (file) {
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          await sendCsv(file)
        } else if (file.type === 'application/sql' || file.name.endsWith('.sql')) {
          await sendSql(file)
        } else {
          appendMessage({
            role: 'assistant',
            content: `Only CSV and SQL files are currently supported.`,
          })
        }
      }
    },
    cursorElement: (
      <m.div className="px-5 py-2.5 text-foreground rounded-full bg-border flex gap-2 items-center shadow-xl z-50">
        <Paperclip size={18} /> Add file to chat
      </m.div>
    ),
  })

  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Add this function to handle textarea resizing
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  // Update the handleInputChange to include height adjustment
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    adjustTextareaHeight()
  }

  // Add useEffect to adjust height on input changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // Scroll to end when chat is first mounted
  useEffect(() => {
    scrollToEnd()
  }, [scrollToEnd])

  // Focus input when LLM starts responding (for cases when it wasn't focused prior)
  useEffect(() => {
    if (isLoading) {
      inputRef.current?.focus()
    }
  }, [isLoading])

  const lastMessage = messages.at(-1)

  const handleFormSubmit: FormEventHandler = useCallback(
    (e) => {
      // Manually manage message submission so that we can control its ID
      // We want to control the ID so that we can perform layout animations via `layoutId`
      // (see hidden dummy message above)
      e.preventDefault()
      appendMessage({
        id: nextMessageId,
        role: 'user',
        content: input,
      })
      setInput('')

      // Scroll to bottom after the message has rendered
      setTimeout(() => {
        scrollToEnd()
      }, 0)
    },
    [appendMessage, nextMessageId, input, setInput, scrollToEnd]
  )

  const [isMessageAnimationComplete, setIsMessageAnimationComplete] = useState(false)

  const isAuthRequired = user === undefined && modelProvider.state?.enabled !== true

  const isChatEnabled =
    !isLoadingMessages && !isLoadingSchema && !isAuthRequired && !liveShare.isLiveSharing

  const isSubmitEnabled = isChatEnabled && Boolean(input.trim())

  // Create imperative handle that can be used to focus the input anywhere in the app
  useImperativeHandle(focusRef, () => ({
    focus() {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    },
  }))

  return (
    <div ref={dropZoneRef} className="h-full flex flex-col items-stretch relative">
      {isDraggingOver && (
        <m.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 0.25 },
          }}
          initial="hidden"
          animate="show"
          className="absolute inset-y-0 -inset-x-2 flex justify-center items-center bg-black rounded-md z-40"
        />
      )}
      {dropZoneCursor}
      <div className="flex-1 relative h-full min-h-0">
        {isLoadingMessages || isLoadingSchema ? (
          <div className="h-full w-full max-w-4xl flex flex-col gap-10 p-5 lg:p-10">
            <Skeleton className="self-end h-10 w-1/3 rounded-3xl" />
            <Skeleton className="self-start h-28 w-2/3 rounded-3xl" />
            <Skeleton className="self-end h-10 w-2/3 rounded-3xl" />
            <Skeleton className="self-start h-56 w-3/4 rounded-3xl" />
            <Skeleton className="self-end h-10 w-1/2 rounded-3xl" />
            <Skeleton className="self-start h-20 w-3/4 rounded-3xl" />
          </div>
        ) : (
          isConversationStarted && (
            <div
              className={cn(
                'h-full flex flex-col items-center overflow-y-auto',
                !isMessageAnimationComplete ? 'overflow-x-hidden' : undefined,
                liveShare.isLiveSharing ? 'overflow-y-hidden' : undefined
              )}
              ref={scrollRef}
            >
              <m.div
                key={databaseId}
                className="flex flex-col gap-8 p-8 w-full max-w-4xl"
                variants={{
                  show: {
                    transition: {
                      staggerChildren: 0.01,
                    },
                  },
                }}
                onAnimationStart={() => setIsMessageAnimationComplete(false)}
                onAnimationComplete={() => setIsMessageAnimationComplete(true)}
                initial="show"
                animate="show"
              >
                {messages.map((message, i) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLast={i === messages.length - 1}
                  />
                ))}
                <AnimatePresence initial={false}>
                  {modelProviderError && !isLoading && (
                    <m.div
                      className="flex items-center gap-4 w-full p-4 bg-destructive/10 text-red-900 rounded-md text-sm"
                      variants={{
                        hidden: { scale: 0 },
                        show: { scale: 1, transition: { delay: 0.5 } },
                      }}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                    >
                      <AlertCircle size={24} strokeWidth={1} className="shrink-0" />
                      <div>
                        <h3 className="font-bold">Whoops!</h3>
                        <p className="mb-2">
                          There was an error connecting to your custom model provider:{' '}
                          {modelProviderError}.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setIsModelProviderDialogOpen(true)
                        }}
                      >
                        Check info
                      </Button>
                    </m.div>
                  )}
                </AnimatePresence>
                <AnimatePresence initial={false}>
                  {isRateLimited && !isLoading && (
                    <m.div
                      className="flex flex-col gap-4 justify-start items-center max-w-96 p-4 bg-destructive rounded-md text-sm"
                      variants={{
                        hidden: { scale: 0 },
                        show: { scale: 1, transition: { delay: 0.5 } },
                      }}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                    >
                      <Flame size={64} strokeWidth={1} />
                      <div className="flex flex-col items-center text-start gap-4">
                        <h3 className="font-bold">Hang tight!</h3>
                        <p>
                          We&apos;re seeing a lot of AI traffic from your end and need to
                          temporarily pause your chats to make sure our servers don&apos;t melt.
                        </p>

                        <p>Have a quick coffee break and try again in a few minutes!</p>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {isLoading && (
                    <m.div
                      className="-translate-x-8 flex gap-4 justify-start items-center"
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1 },
                      }}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                    >
                      <m.div>
                        <AiIconAnimation loading />
                      </m.div>
                      {lastMessage &&
                        (lastMessage.role === 'user' ||
                          (lastMessage.role === 'assistant' && !lastMessage.content)) && (
                          <m.div
                            className="text-neutral-400 italic"
                            variants={{
                              hidden: { opacity: 0 },
                              show: { opacity: 1, transition: { delay: 1.5 } },
                            }}
                            initial="hidden"
                            animate="show"
                          >
                            Working on it...
                          </m.div>
                        )}
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            </div>
          )
        )}
        <AnimatePresence>
          {!isSticky && (
            <>
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none"
              />
              <m.div
                className="absolute bottom-4 left-1/2"
                variants={{
                  hidden: { y: 5, opacity: 0 },
                  show: { y: 0, opacity: 1 },
                }}
                transition={{ duration: 0.1 }}
                initial="hidden"
                animate="show"
                exit="hidden"
              >
                <Button
                  className="rounded-full w-8 h-8 p-1.5 text-neutral-50 bg-neutral-900"
                  onClick={() => {
                    scrollToEnd()
                    inputRef.current?.focus()
                  }}
                >
                  <ArrowDown />
                </Button>
              </m.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center gap-3 relative p-8 pt-0">
        <AnimatePresence>
          {!isLoadingUser && (
            <>
              {isAuthRequired ? (
                <m.div
                  className="bg-background w-full mb-4 pt-4"
                  variants={{
                    hidden: { opacity: 0, y: 100 },
                    show: { opacity: 1, y: 0 },
                  }}
                  animate="show"
                  exit="hidden"
                >
                  <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none"
                  />
                  <h3 className="font-medium">Sign in to create a database</h3>
                  <p className="text-foreground-muted mb-4">
                    We ask you to sign in to prevent API abuse.
                  </p>
                  <div className="space-y-1">
                    <SignInButton />
                    <ByoLlmButton className="w-full" />
                  </div>
                </m.div>
              ) : (
                !isConversationStarted &&
                !isLoadingMessages &&
                !isLoadingSchema && (
                  <div className="h-full w-full max-w-4xl flex flex-col gap-10 mb-8">
                    <div>
                      <m.h3
                        className="font-medium"
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0 },
                        }}
                        initial="hidden"
                        animate="show"
                      >
                        What would you like to create?
                      </m.h3>
                      <p className="text-muted-foreground">
                        Describe what you want to build and add any specific database requirements.
                      </p>
                      <div className="flex gap-2 flex-wrap mt-4 justify-start">
                        <Button
                          variant="secondary"
                          className="rounded-full"
                          onClick={() =>
                            setInput(
                              'Create a Slack clone with channels, direct messages, and user profiles. Include tables for users, channels, messages, and channel memberships.'
                            )
                          }
                        >
                          A Slack clone
                        </Button>
                        <Button
                          variant="secondary"
                          className="rounded-full"
                          onClick={() =>
                            setInput(
                              'Create a document database schema with support for hierarchical document storage, versioning, and metadata. Include tables for documents, versions, and tags.'
                            )
                          }
                        >
                          Document database
                        </Button>
                        <Button
                          variant="secondary"
                          className="rounded-full"
                          onClick={() =>
                            setInput(
                              'Create a todo list application with support for multiple lists, due dates, priorities, and task categories. Include tables for users, lists, tasks, and categories.'
                            )
                          }
                        >
                          Todo list
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </AnimatePresence>
        <form
          className={cn(
            'p-1 rounded-lg bg-muted/50 border w-full',
            inputFocusState && 'border-muted-foreground',
            'transition'
          )}
          onSubmit={handleFormSubmit}
        >
          <textarea
            ref={inputRef}
            id="input"
            name="prompt"
            autoComplete="off"
            className="w-full border-none focus-visible:ring-0 h-auto min-h-[2.5rem] placeholder:text-muted-foreground/50 bg-transparent resize-none outline-none p-2"
            value={input}
            onChange={handleInputChange}
            placeholder="Message AI or write SQL"
            onFocus={(e) => {
              setInputFocusState(true)
            }}
            onBlur={(e) => {
              setInputFocusState(false)
            }}
            autoFocus
            disabled={!isChatEnabled}
            rows={Math.max(2, Math.min(input.split('\n').length, 10))}
            onKeyDown={(e) => {
              if (!(e.target instanceof HTMLTextAreaElement)) {
                return
              }

              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                if (!isLoading && isSubmitEnabled) {
                  handleFormSubmit(e)
                }
              }
            }}
          />
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant={'ghost'}
              className="w-8 h-8 text-muted-foreground hover:text-foreground focus:text-foreground rounded-full"
              size="icon"
              onClick={async (e) => {
                e.preventDefault()

                if (isAuthRequired) {
                  return
                }

                const file = await requestFileUpload()
                await sendCsv(file)
              }}
              disabled={!isChatEnabled}
            >
              <Paperclip size={18} strokeWidth={1.3} />
            </Button>
            {isLoading ? (
              <Button
                className="rounded-full w-8 h-8 p-0 justify-center items-center"
                size="icon"
                type="submit"
                onClick={(e) => {
                  e.preventDefault()
                  stopReply()
                }}
              >
                <Square size={16} />
              </Button>
            ) : (
              <Button
                className="rounded-full w-8 h-8 p-0 justify-center items-center"
                type="submit"
                disabled={!isSubmitEnabled}
              >
                <ArrowUp size={16} className="text-primary-foreground" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
```


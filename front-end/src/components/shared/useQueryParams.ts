import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type QueryParamsFormat = Record<string, string>

export type UpdateQueryParamsSettings<Params> = Partial<{ [K in keyof Params]: string | null }>

interface QueryParamsResult<Params> {
  queryParams: Params
  updateQueryParams: (newParams: UpdateQueryParamsSettings<Params>, replace?: boolean) => void
}

function useQueryParams<Params extends QueryParamsFormat>(): QueryParamsResult<Params> {
  const { search, pathname } = useLocation()
  const navigate = useNavigate()

  const queryParams = useMemo(() => {
    const qp = new URLSearchParams(search)

    const obj: Record<string, string> = {}
    for (const [key, value] of qp.entries()) {
      obj[key] = value
    }

    return obj as Params
  }, [search])

  const updateQueryParams = useCallback(
    (newParams: Partial<{ [K in keyof Params]: string | null }>, replace = false) => {
      const qp = new URLSearchParams(search)
      for (const [key, value] of Object.entries(newParams)) {
        console.log(Object.entries(newParams))
        if (value === null) {
          qp.delete(key)
        } else if (value !== undefined) {
          qp.set(key, value)
        }
      }
      const newSearch = qp.toString() ? `?${qp.toString()}` : ''
      navigate({ pathname, search: newSearch }, { replace })
    },
    [search, pathname, navigate],
  )

  return { queryParams, updateQueryParams }
}

export default useQueryParams

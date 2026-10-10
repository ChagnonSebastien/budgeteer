import { Box, Stack } from '@mui/material'
import { FC, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { IconToolsContext } from './IconTools'

const perfectMultiplier = 4 * 3 * 5 * 7

interface Props {
  filter: string
  onSelect: (selectedIcon: string) => void
}

const IconList: FC<Props> = ({ filter, onSelect }) => {
  const [amountItems, setAmountItems] = useState<number>(perfectMultiplier)
  const { iconNameList, iconTypeFromName } = useContext(IconToolsContext)

  useEffect(() => setAmountItems(perfectMultiplier), [filter])

  const filteredIcons = useMemo(() => {
    return iconNameList.filter((value) => value.toLowerCase().includes(filter.toLowerCase())).slice(0, amountItems)
  }, [iconNameList, filter, amountItems])

  const loadMoreRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setAmountItems((prevState) => prevState + perfectMultiplier)
      }
    })

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [])

  return (
    <Box sx={{ position: 'relative' }}>
      <Stack direction="row" flexWrap="wrap" justifyContent="space-evenly" sx={{ pt: 1 }}>
        {filteredIcons.map((iconName) => {
          const IconType = iconTypeFromName(iconName)
          return (
            <Box
              onClick={() => onSelect(iconName)}
              key={`icon-list-element-${iconName}`}
              sx={{ m: 0.25, p: 1, borderRadius: (t) => t.radius.md }}
            >
              <IconType size="2.5rem" />
            </Box>
          )
        })}
      </Stack>
      <Box ref={loadMoreRef} sx={{ zIndex: -1, height: '100vh', position: 'absolute', bottom: 0, left: 0, right: 0 }} />
    </Box>
  )
}

export default IconList

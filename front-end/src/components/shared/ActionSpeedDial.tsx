import { Box, Palette, SpeedDial, SpeedDialAction, SpeedDialIcon, Tooltip } from '@mui/material'
import { FC, useContext } from 'react'
import type { IconType } from 'react-icons'

import usePinnableSpeedDial from './usePinnableSpeedDial'
import { IconToolsContext } from '../icons/IconTools'

export type ActionColor = `money.${keyof Palette['money']}` | `intent.${keyof Palette['intent']}` | 'grey.500'

export interface DialAction {
  label: string
  Icon: IconType
  color: ActionColor
  onClick(): void
}

const ActionSpeedDial: FC<{ ariaLabel: string; actions: DialAction[]; hint?: string }> = ({
  ariaLabel,
  actions,
  hint,
}) => {
  const { IconLib } = useContext(IconToolsContext)
  const dial = usePinnableSpeedDial()

  return (
    <>
      {hint && (
        <Tooltip open={!dial.open} title={hint} placement="left" arrow>
          <Box
            sx={{
              position: 'absolute',
              bottom: (t) => t.spacing(2),
              right: (t) => t.spacing(2),
              width: 56,
              height: 56,
              pointerEvents: 'none',
            }}
          />
        </Tooltip>
      )}
      <SpeedDial
        ariaLabel={ariaLabel}
        sx={{ position: 'absolute', bottom: (t) => t.spacing(2), right: (t) => t.spacing(2) }}
        {...dial}
        icon={
          <SpeedDialIcon
            openIcon={<IconLib.FaPlus />}
            sx={{
              '& .MuiSpeedDialIcon-icon, & .MuiSpeedDialIcon-openIcon': {
                transition: 'all 0.2s ease-in-out',
                height: 24,
                width: 24,
              },
              '& .MuiSpeedDialIcon-openIcon': { transform: 'rotate(45deg)' },
            }}
          />
        }
      >
        {actions.map(({ label, Icon, color, onClick }) => (
          <SpeedDialAction
            key={label}
            icon={<Icon />}
            onClick={onClick}
            tooltipTitle={label}
            tooltipOpen
            slotProps={{
              fab: { sx: { bgcolor: color, color: 'common.white', '&:hover': { bgcolor: color } } },
              staticTooltipLabel: { sx: { whiteSpace: 'nowrap' } },
            }}
          />
        ))}
      </SpeedDial>
    </>
  )
}

export default ActionSpeedDial

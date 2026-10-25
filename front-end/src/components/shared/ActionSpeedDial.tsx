import { Box, Fab, Palette, SpeedDial, SpeedDialAction, SpeedDialIcon, Theme, Tooltip } from '@mui/material'
import { FC, useContext } from 'react'
import type { IconType } from 'react-icons'

import usePinnableSpeedDial from './usePinnableSpeedDial'
import { ReadOnlyContext } from '../../service/ReadOnlyContext'
import { IconToolsContext } from '../icons/IconTools'

export type ActionColor =
  | `money.${keyof Palette['money']}`
  | `intent.${keyof Palette['intent']}`
  | 'grey.500'
  | 'primary.main'

const fabPosition = {
  position: 'absolute',
  bottom: (t: Theme) => `calc(${t.spacing(2)} + env(safe-area-inset-bottom))`,
  right: (t: Theme) => `calc(${t.spacing(2)} + env(safe-area-inset-right))`,
} as const
const fabIconSize = 18

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
  const readOnly = useContext(ReadOnlyContext)

  if (readOnly) {
    const [{ label, Icon }] = actions
    return (
      <Tooltip title={readOnly.label} placement="left" arrow>
        <Box component="span" sx={fabPosition}>
          <Fab disabled aria-label={actions.length === 1 ? label : ariaLabel}>
            {actions.length === 1 ? <Icon size={fabIconSize} /> : <IconLib.FaPlus size={fabIconSize} />}
          </Fab>
        </Box>
      </Tooltip>
    )
  }

  if (actions.length === 1) {
    const [{ label, Icon, onClick }] = actions
    return (
      <Tooltip open={hint ? true : undefined} title={hint ?? label} placement="left" arrow>
        <Fab color="primary" aria-label={label} onClick={onClick} sx={fabPosition}>
          <Icon size={fabIconSize} />
        </Fab>
      </Tooltip>
    )
  }

  return (
    <>
      {hint && (
        <Tooltip open={!dial.open} title={hint} placement="left" arrow>
          <Box
            sx={{
              ...fabPosition,
              width: 56,
              height: 56,
              pointerEvents: 'none',
            }}
          />
        </Tooltip>
      )}
      <SpeedDial
        ariaLabel={ariaLabel}
        sx={fabPosition}
        {...dial}
        icon={
          <SpeedDialIcon
            icon={<IconLib.FaPlus />}
            openIcon={<IconLib.FaPlus />}
            sx={{
              height: fabIconSize,
              width: fabIconSize,
              '& .MuiSpeedDialIcon-icon, & .MuiSpeedDialIcon-openIcon': {
                transition: 'all 0.2s ease-in-out',
                height: fabIconSize,
                width: fabIconSize,
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

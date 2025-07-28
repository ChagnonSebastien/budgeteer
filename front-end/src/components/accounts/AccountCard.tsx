import { startOfDay } from 'date-fns'
import { useContext } from 'react'
import styled from 'styled-components'

import { ItemProps } from './ItemList'
import Account, { AccountID } from '../../domain/model/account'
import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CurrencyServiceContext } from '../../service/ServiceContext'
import { DrawerContext } from '../Menu'

const AccountListItem = styled.div<{ $selected: boolean; $withBalance: boolean }>`
  border-radius: 0.5rem;
  transition: all 200ms ease-in-out;
  border-left: 3px solid transparent;
  margin: 0.125rem 0;
  cursor: pointer;

  ${({ $withBalance }) =>
    $withBalance &&
    `
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1rem;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    margin: 0.25rem 0;
  `}

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);

    ${({ $withBalance }) =>
      $withBalance &&
      `
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
    `}
  }

  ${({ $selected }) =>
    $selected &&
    `
    background-color: rgba(200, 75, 49, 0.12);
    border-left-color: #C84B31;

    &:hover {
      background-color: rgba(200, 75, 49, 0.16);
    }
  `}
`

export type AdditionalAccountCardProps = {
  showBalances?: boolean
}

type Props = ItemProps<AccountID, Account, AdditionalAccountCardProps>

export const AccountCard = (props: Props) => {
  const { item, selected = false, onClick = () => {}, showBalances = false } = props
  const { accountBalances, exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const { state: currencies } = useContext(CurrencyServiceContext)

  const totalValue = [...(accountBalances?.get(item.id)?.entries() ?? [])].reduce((prev: number, entry) => {
    const currency = currencies.find((c) => c.id === entry[0])
    if (typeof currency === 'undefined') return prev

    let rate = 1
    if (entry[0] !== defaultCurrency.id) {
      rate = exchangeRateOnDay(entry[0], defaultCurrency.id, startOfDay(new Date()))
    }

    return prev + entry[1] * rate
  }, 0)

  return (
    <AccountListItem $selected={selected} $withBalance={showBalances} onClick={onClick}>
      <div
        style={{
          alignItems: 'stretch',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          padding: showBalances ? '1rem 1.5rem' : '0.75rem 1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
              color: 'rgba(255, 255, 255, 0.87)',
            }}
          >
            {item.name}
          </div>

          {showBalances && totalValue !== 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {formatFull(defaultCurrency, totalValue, privacyMode)}
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountListItem>
  )
}

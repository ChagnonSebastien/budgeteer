import { Typography } from '@mui/material'
import { FC, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ItemList from '../components/accounts/ItemList'
import CurrencyCard from '../components/currencies/CurrencyCard'
import ExchangeRateHistory from '../components/graphing/ExchangeRateHistory'
import { IconToolsContext } from '../components/icons/IconTools'
import { SearchOverlay } from '../components/inputs/SearchOverlay'
import BasicModal from '../components/shared/BasicModal'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, FancyModal } from '../components/shared/FancyModal'
import ScrollingOverButton, { CustomScrolling } from '../components/shared/ScrollingOverButton'
import Currency, { CurrencyID } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

const CurrenciesPage: FC = () => {
  const navigate = useNavigate()
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { defaultCurrency } = useContext(MixedAugmentation)
  const { IconLib } = useContext(IconToolsContext)
  const [filter, setFilter] = useState('')
  const [clickedCurrency, setClickedCurrency] = useState<Currency | null>(null)
  const scrollingContainerRef = useRef<HTMLDivElement>(null)
  const { accountBalances } = useContext(MixedAugmentation)
  const { state: accounts } = useContext(AccountServiceContext)

  const getTotalForCurrency = (targetCurrencyId: CurrencyID): number => {
    let total = 0
    const myAccountIds = new Set(accounts.filter((account) => account.isMine).map((account) => account.id))

    accountBalances?.forEach((balances, accountId) => {
      if (!myAccountIds.has(accountId)) return
      const amount = balances.get(targetCurrencyId)
      if (amount) {
        total += amount
      }
    })
    return total
  }

  const orderedCurrencies = [...currencies].sort(
    (a, b) => Number(getTotalForCurrency(a.id) === 0) - Number(getTotalForCurrency(b.id) === 0),
  )

  return (
    <ContentWithHeader title="Currencies" action="menu" withPadding>
      <ScrollingOverButton
        button={{ text: 'New', onClick: () => navigate('/currencies/new') }}
        scrollingContainerRef={scrollingContainerRef}
        contentStyle={{ maxWidth: '50rem' }}
      >
        <CustomScrolling
          ref={scrollingContainerRef}
          style={{
            overflowY: 'auto',
            flexGrow: 1,
            paddingBottom: '4rem',
            position: 'relative',
            gap: '0.05rem',
          }}
        >
          <ItemList
            items={orderedCurrencies}
            ItemComponent={CurrencyCard}
            selectConfiguration={{
              mode: 'click',
              onClick: (item: Currency) => setClickedCurrency(currencies.find((c) => c.id === item.id) ?? null),
            }}
            additionalItemsProps={{
              total: getTotalForCurrency,
            }}
          />
        </CustomScrolling>

        <SearchOverlay filter={filter} setFilter={setFilter} placeholder="Search currencies..." />
      </ScrollingOverButton>

      <BasicModal
        open={clickedCurrency !== null}
        onClose={() => setClickedCurrency(null)}
        slotProps={{
          paper: {
            style: {
              backgroundColor: 'transparent',
              borderRadius: '24px',
              border: '0',
              overflow: 'hidden',
            },
          },
        }}
      >
        {clickedCurrency !== null && (
          <FancyModal
            title={{
              topCategory: 'Currency',
              bigTitle: clickedCurrency.name,
              bottomSpec: {
                IconComponent: IconLib.BsCurrencyExchange,
                text: clickedCurrency.symbol,
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Currency',
                color: '#64B5F6',
                description: 'Modify currency details',
                action: () => navigate(`/currencies/edit/${clickedCurrency.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Currency',
                color: '#EF5350',
                description: 'Remove this currency',
                action: () => {},
                disabled: true,
              },
            ]}
          >
            {clickedCurrency.id === defaultCurrency.id ? (
              <DetailCard title="Default Currency" value="" />
            ) : (
              <>
                <Typography
                  variant="subtitle2"
                  style={{
                    opacity: 0.6,
                    marginBottom: '16px',
                    letterSpacing: '0.05em',
                    fontSize: '0.75rem',
                  }}
                >
                  EXCHANGE RATE HISTORY
                </Typography>
                <div
                  style={{
                    height: 'max(25vh, 200px)',
                    display: 'flex',
                    justifyContent: 'stretch',
                    justifyItems: 'stretch',
                  }}
                >
                  <ExchangeRateHistory currency={clickedCurrency} against={defaultCurrency} />
                </div>{' '}
              </>
            )}
          </FancyModal>
        )}
      </BasicModal>
    </ContentWithHeader>
  )
}

export default CurrenciesPage

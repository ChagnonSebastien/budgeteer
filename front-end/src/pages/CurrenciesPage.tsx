import { FC, useContext, useState } from 'react'

import ItemList from '../components/accounts/ItemList'
import CurrencyCard from '../components/currencies/CurrencyCard'
import DeleteCurrencyDialog from '../components/currencies/DeleteCurrencyDialog'
import ExchangeRateHistory from '../components/graphing/ExchangeRateHistory'
import { IconToolsContext } from '../components/icons/IconTools'
import ActionSpeedDial from '../components/shared/ActionSpeedDial'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { CustomScrolling } from '../components/shared/CustomScrolling'
import { DetailCard, DetailHeading, FancyDialog, FancyModal } from '../components/shared/FancyModal'
import { useNavigateFromDialog } from '../components/shared/useCloseOnBack'
import Currency, { CurrencyID } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

const CurrenciesPage: FC = () => {
  const navigate = useNavigateFromDialog()
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { defaultCurrency } = useContext(MixedAugmentation)
  const { IconLib } = useContext(IconToolsContext)
  const [filter, setFilter] = useState('')
  const [clickedCurrency, setClickedCurrency] = useState<Currency | null>(null)
  const [currencyToDelete, setCurrencyToDelete] = useState<Currency | null>(null)
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

  const search = filter.trim().toLowerCase()
  const orderedCurrencies = currencies
    .filter((c) => search === '' || c.name.toLowerCase().includes(search) || c.symbol.toLowerCase().includes(search))
    .sort((a, b) => Number(getTotalForCurrency(a.id) === 0) - Number(getTotalForCurrency(b.id) === 0))

  return (
    <ContentWithHeader
      title="Currencies"
      action="menu"
      withPadding
      search={{ value: filter, onChange: setFilter, placeholder: 'Search currencies...' }}
    >
      <CustomScrolling
        sx={{ width: '100%', height: '100%', maxWidth: (t) => t.contentWidth.default, pb: 11, gap: 0.125 }}
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

      <ActionSpeedDial
        ariaLabel="Create currency"
        actions={[
          {
            label: 'New currency',
            Icon: IconLib.FaPlus,
            color: 'primary.main',
            onClick: () => navigate('/currencies/new'),
          },
        ]}
      />

      <FancyDialog open={clickedCurrency !== null} onClose={() => setClickedCurrency(null)}>
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
                intent: 'edit',
                description: 'Modify currency details',
                action: () => navigate(`/currencies/edit/${clickedCurrency.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Currency',
                intent: 'destructive',
                description: 'Move or delete its transactions, then remove it',
                action: () => setCurrencyToDelete(clickedCurrency),
                disabled: false,
              },
            ]}
          >
            {clickedCurrency.id === defaultCurrency.id ? (
              <DetailCard title="Default Currency" value="" />
            ) : (
              <>
                <DetailHeading>EXCHANGE RATE HISTORY</DetailHeading>
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
      </FancyDialog>
      {currencyToDelete && (
        <DeleteCurrencyDialog
          currency={currencyToDelete}
          onClose={() => setCurrencyToDelete(null)}
          onDeleted={() => {
            setCurrencyToDelete(null)
            setClickedCurrency(null)
          }}
        />
      )}
    </ContentWithHeader>
  )
}

export default CurrenciesPage

import { Button } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AccountList } from '../components/AccountList'
import ContentWithHeader from '../components/ContentWithHeader'
import { AccountServiceContext } from '../service/ServiceContext'

const AccountsPage: FC = () => {
  const navigate = useNavigate()

  const { state: accounts } = useContext(AccountServiceContext)

  const [filter, setFilter] = useState('')
  const [scrollProgress, setScrollProgress] = useState(1)

  const [optionsHeight, setOptionsHeight] = useState(240)
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(600)
  useEffect(() => {
    if (contentRef === null) return
    const ref = contentRef

    const callback = () => {
      setContentHeight(ref.clientHeight)
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [contentRef])

  return (
    <ContentWithHeader title="Accounts" button="menu" contentMaxWidth="100%" contentOverflowY="hidden">
      <div style={{ height: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'center' }} ref={setContentRef}>
        <div style={{ maxWidth: '50rem', flexGrow: 1 }}>
          <div
            style={{
              width: '100%',
              position: 'relative',
              height: `${contentHeight - optionsHeight}px`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <AccountList
              accounts={accounts}
              onSelect={(account) => navigate(`/accounts/edit/${account.id}`)}
              showBalances
              filterable={{ filter, setFilter }}
              onScrollProgress={setScrollProgress}
            />
          </div>
          <div
            ref={(ref) => {
              if (ref !== null) setOptionsHeight(ref.scrollHeight)
            }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                height: '1rem',
                borderTop: '1px solid transparent',
                borderImage: 'linear-gradient(to right, transparent, #fff4 20%, #fff4 80%, transparent) 1',
                background: 'radial-gradient(ellipse 100% 100% at 50% 0%, #fff2 0%, #fff0 50%, transparent 100%)',
                opacity: scrollProgress,
              }}
            />
            <Button fullWidth variant="contained" onClick={() => navigate('/accounts/new')}>
              New
            </Button>
          </div>
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default AccountsPage

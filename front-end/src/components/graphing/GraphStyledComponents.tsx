import { default as styled } from 'styled-components'

import { Column } from '../shared/Layout'

export const GraphContainer = styled.div`
  width: 100%;
`

export const FirstDivision = styled.div`
  width: 100%;
  max-width: 100vh;
  align-items: stretch;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  margin: 0 auto;
  flex-grow: 1;
`

export const SecondDivision = styled(Column)<{ $splitView?: boolean }>`
  padding: 1rem 2rem;
  border-top: ${(props) => (props.$splitView ? 'none' : '1px solid rgba(128,128,128,0.2)')};
  height: ${(props) => (props.$splitView ? '100%' : 'auto')};
  gap: 2rem;
  align-self: stretch;
`

export const GraphTooltip = styled.div`
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  z-index: 100;
`

export const GraphTooltipDate = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`

export const GraphTooltipRow = styled.div`
  display: flex;
  align-items: center;
`

export const GraphTooltipColor = styled.div`
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 0.125rem;
  margin-right: 0.5rem;
`

export const GraphTooltipLabel = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
`

export const GraphTooltipValue = styled.div`
  margin-left: auto;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
`

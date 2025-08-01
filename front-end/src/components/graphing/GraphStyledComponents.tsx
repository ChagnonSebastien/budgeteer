import { default as styled } from 'styled-components'

export const GraphPageContainer = styled.div`
  height: 100%;
  width: 100%;
`

export const GraphContainer = styled.div<{ height: number }>`
  height: ${(props) => `${props.height}px`};
  width: 100%;
  display: flex;
  justify-content: center;
  padding-bottom: 1rem;

  & > div {
    max-width: 100vh;
  }
`

export const ControlsContainer = styled.div<{ $splitView?: boolean }>`
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.02);
  border-top: ${(props) => (props.$splitView ? 'none' : '1px solid rgba(255, 255, 255, 0.1)')};
`

export const SplitViewContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
`

export const GraphSelectField = styled.div`
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-1px);
  }
`

export const GraphTooltip = styled.div`
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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

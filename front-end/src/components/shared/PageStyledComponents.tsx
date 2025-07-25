import styled from 'styled-components'

// Common page layout components that are reused across multiple pages

export const PageContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  max-width: 100%;
`

export const ListContentContainer = styled.div`
  max-width: 50rem;
  flex-grow: 1;
`

export const ScrollAreaContainer = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

export const FadingDivider = styled.div<{ opacity: number }>`
  height: 1rem;
  border-top: 1px solid transparent;
  border-image: linear-gradient(to right, transparent, #fff4 20%, #fff4 80%, transparent) 1;
  background: radial-gradient(ellipse 100% 100% at 50% 0%, #fff2 0%, #fff0 50%, transparent 100%);
  opacity: ${(props) => props.opacity};
`

export const ChartContainer = styled.div`
  height: 200px;
  margin-top: 16px;
`

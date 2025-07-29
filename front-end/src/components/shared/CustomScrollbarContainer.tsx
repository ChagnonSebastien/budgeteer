import styled from 'styled-components'

export const CustomScrollbarContainer = styled.div`
  overflow-y: auto;
  padding-left: 1rem;
  padding-right: 1rem;

  /* Modern scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    transition: background-color 200ms;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Firefox scrollbar styling */
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
`

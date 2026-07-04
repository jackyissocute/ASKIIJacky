export const ASCII_PERSON_HOVER_EVENT = 'ascii-person-hover'

export type AsciiPersonHoverDetail = {
  active: boolean
  x: number
  y: number
  label: string
}

export function dispatchAsciiPersonHover(detail: AsciiPersonHoverDetail) {
  window.dispatchEvent(
    new CustomEvent<AsciiPersonHoverDetail>(ASCII_PERSON_HOVER_EVENT, {
      detail,
    }),
  )
}

export const state = {
  name: 'Tom',
  age: 10,
}

export function changeName(dispatch, name) {
  dispatch(state => {
    state.name = name
  })
}

export function changeAge(dispatch, age) {
  dispatch(state => {
    state.age = age
  })
}
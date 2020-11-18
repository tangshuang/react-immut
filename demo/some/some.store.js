export const name = Symbol('some')

export const state = {
  name: 'Tom',
  age: 10,
}

export const changeName = (dispatch) => (name) => {
  dispatch(state => {
    state.name = name
  })
}

export const changeAge = (dispatch) => (age) => {
  dispatch(state => {
    state.age = age
  })
}

# REACT IMMUT

React immutable state management.

## Install

```
npm i react-immut
```

## Usage

```js
import { createStore, Provider, connect, useStore } from 'react-immut'
```

**Step 1: create a store.**

```js
const store = createStore({ name: 'Tom' })
```

**Step 2: wrap with Provider.**

```js
function App() {
  return (
    <Provider store={store}>
      <div>title</div>
      <MyComponent />
    </Provider>
  )
}
```

**Step 3: use connect/useStore.**

```js
function MyComponent(props) {
  const { name } = props
  return <span>{name}</span>
}

const mapStateToProps = (state) => {
  const { name } = state
  return { name }
}

export default connect(mapStateToProps)(MyComponent)
```

Or:

```js
function MyComponent() {
  const [name] = useStore('name')
  return <span>{name}</span>
}
```

**Step 4: dispatch change.**

```js
const mapDispatchToProps = (dispatch) => {
  const changeName = (newName) => {
    dispatch(state => state.name = newName)
  }
  return { changeName }
}

export default connect(null, mapDispatchToProps)(MyComponent)
```

Or:

```js
function MyComponent() {
  const [_, dispatch] = useStore('name')
  const changeName = (newName) => {
    dispatch(() => newName)
  }

  // // or:
  // const [_, dispatch] = useState()
  // const changeName = (newName) => {
  //   dispatch(state => state.name = newName)
  // }

  return <span onClick={changeName}>{name}</span>
}
```

## dispatch(keyPath?, update)

To change state, you will use `dispatch` method. It receive two parameters:

```ts
dispatch(keyPath?: string|array, update: function)
```

- `keyPath` is optional, it means which state (should must be an object) node you want to change.
- `update` is a function, which receives the state (or picked node) to be modified and returns the new value

```js
// normal usage
dispatch(state => {
  state.name = 'New Name'
})

// with keyPath
dispatch('books[0]', book => {
  book.name = 'New Name'
})

// with return value
dispatch(state => {
  return {
    ...state,
    name: 'New Name',
  }
})
dispatch('books[0].name', name => {
  return 'New Name'
})
```

Learn more about the deep knowledge from [immer](https://github.com/immerjs/immer).

## useStore(keyPath)

*Notice that, you should use `useStore` hook function inside `Provider`, or it will read none value.*

When you did not pass `keyPath`, you will get the whole state and dispatch which operate the whole state.

```js
function MyComponent() {
  const [state, dispatch] = useStore()
}
```

## Ajax

```js
fetch(url).then(res => res.json()).then(data => dispatch(state => {
  const { name } = data
  state.name = name
}))
```

## Combined Store

In many situations, developers want to split the whole state and put component's files tegother. We provide a way to implement this easily.

```js
// components/a-some/store.js
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
```

```js
// app.js
import { createStore } from 'react-immut'
import * as Asome from './components/a-some/store.js'

// set namespaces into the second parameter
const store = createStore(null, {
  Asome,
})

export default function App() {
  return (
    <Provider store={store}>
      ...
    </Provider>
  )
}
```

`Asome` is a namespace, you can use this namespace in a component like this:

```js
// components/a-some/index.jsx
import { connect } from 'react-immut'

const mapStateToProps = (state) => {
  const { Asome } = state // use namespace as a property of state, the state properties are on it
  return { ...Asome }
}

const mapDispatchToProps = (dispatch) => {
  // here dispatch is a function, but defined dispatchers in store.js are patched on it
  const { Asome } = dispatch // use namespace as a property, the methods are on it
  return { ...Asome }
}

export default connect(mapStateToProps, mapDispatchToProps)(Asome)

function Asome(props) {
  const { name, age, changeName, changeAge } = props

  return (
    <>
      <button onClick={() => changeName('new name')}>change name</button>
      <button onClick={() => changeAge(20)}>change age</button>
    </>
  )
}
```

In the previous code block, we use `changeName('new name')` directly the parameter will be passed into defined `changeName` as the second parameter in `store.js`.

`useStore` works:

```js
function Asome(props) {
  const [{ name, age }, { changeName, changeAge }] = useStore('Asome')

  return (
    <>
      <button onClick={() => changeName('new name')}>change name</button>
      <button onClick={() => changeAge(20)}>change age</button>
    </>
  )
}
```

## License

MIT.
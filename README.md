# REACT IMMUT

React immutable state management.

## Install

```
npm i react-immut
```

## Usage

```js
import { Store, Provider, connect, useStore } from 'react-immut'
```

**Step 1: create a store.**

```js
const store = new Store({ name: 'Tom' })
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

## dispatch(keyPath?, fn)

To change state, you will use `dispatch` method. It receive two parameters:

```ts
dispatch(keyPath?: string|array, fn: function)
```

- `keyPath` is optional, it means which state (should must be an object) node you want to change.
- `fn` is a function, which receives the state (or picked node) to be modified and returns the new value

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

## MIT.
const expect = require('expect');
const { pushPath, replacePath, UPDATE_PATH, routeReducer, syncReduxAndRouter } = require('../src/index');
const { createStore, combineReducers } = require('redux');
const { createMemoryHistory: createHistory } = require('history');

function createSyncedHistoryAndStore() {
  const store = createStore(combineReducers({
    routing: routeReducer
  }));
  const history = createHistory();
  syncReduxAndRouter(history, store);
  return { history, store };
}

describe('pushPath', () => {
  it('creates actions', () => {
    expect(pushPath('/foo', { bar: 'baz' })).toEqual({
      type: UPDATE_PATH,
      path: '/foo',
      replace: false,
      state: { bar: 'baz' },
      avoidRouterUpdate: false
    });

    expect(pushPath('/foo', undefined, { avoidRouterUpdate: true })).toEqual({
      type: UPDATE_PATH,
      path: '/foo',
      state: undefined,
      replace: false,
      avoidRouterUpdate: true
    });
  });
});

describe('replacePath', () => {
  it('creates actions', () => {
    expect(replacePath('/foo', { bar: 'baz' })).toEqual({
      type: UPDATE_PATH,
      path: '/foo',
      replace: true,
      state: { bar: 'baz' },
      avoidRouterUpdate: false
    });

    expect(replacePath('/foo', undefined, { avoidRouterUpdate: true })).toEqual({
      type: UPDATE_PATH,
      path: '/foo',
      state: undefined,
      replace: true,
      avoidRouterUpdate: true
    });

    expect(replacePath('/foo', undefined, { avoidRouterUpdate: false })).toEqual({
      type: UPDATE_PATH,
      path: '/foo',
      state: undefined,
      replace: true,
      avoidRouterUpdate: false
    });
  });
});

describe('routeReducer', () => {
  const state = {
    path: '/foo',
    changeId: 1
  };

  it('updates the path', () => {
    expect(routeReducer(state, {
      type: UPDATE_PATH,
      path: '/bar',
      replace: false
    })).toEqual({
      path: '/bar',
      replace: false,
      state: undefined,
      changeId: 2
    });
  });

  it('respects replace', () => {
    expect(routeReducer(state, {
      type: UPDATE_PATH,
      path: '/bar',
      replace: true,
      avoidRouterUpdate: false
    })).toEqual({
      path: '/bar',
      replace: true,
      state: undefined,
      changeId: 2
    });
  });

  it('respects `avoidRouterUpdate` flag', () => {
    expect(routeReducer(state, {
      type: UPDATE_PATH,
      path: '/bar',
      replace: false,
      avoidRouterUpdate: true
    })).toEqual({
      path: '/bar',
      replace: false,
      state: undefined,
      changeId: 1
    });
  });
});

describe('syncReduxAndRouter', () => {
  it('syncs router -> redux', () => {
    const { history, store } = createSyncedHistoryAndStore();
    expect(store.getState().routing.path).toEqual('/');

    history.pushState(null, '/foo');
    expect(store.getState().routing.path).toEqual('/foo');
    expect(store.getState().routing.state).toBe(null);

    history.pushState({ bar: 'baz' }, '/foo');
    expect(store.getState().routing.path).toEqual('/foo');
    expect(store.getState().routing.state).toEqual({ bar: 'baz' });

    history.replaceState(null, '/bar');
    expect(store.getState().routing.path).toEqual('/bar');
    expect(store.getState().routing.state).toBe(null);

    history.pushState(null, '/bar');
    expect(store.getState().routing.path).toEqual('/bar');
    expect(store.getState().routing.state).toBe(null);

    history.pushState(null, '/bar?query=1');
    expect(store.getState().routing.path).toEqual('/bar?query=1');

    history.replaceState({ bar: 'baz' }, '/bar?query=1');
    expect(store.getState().routing.path).toEqual('/bar?query=1');
    expect(store.getState().routing.state).toEqual({ bar: 'baz' });

    history.pushState(null, '/bar?query=1#hash=2');
    expect(store.getState().routing.path).toEqual('/bar?query=1#hash=2');
  });

  it('syncs redux -> router', () => {
    const { history, store } = createSyncedHistoryAndStore();
    expect(store.getState().routing).toEqual({
      path: '/',
      changeId: 1,
      replace: false,
      state: undefined
    });

    store.dispatch(pushPath('/foo'));
    expect(store.getState().routing).toEqual({
      path: '/foo',
      changeId: 2,
      replace: false,
      state: undefined
    });

    store.dispatch(pushPath('/foo', { bar: 'baz' }));
    expect(store.getState().routing).toEqual({
      path: '/foo',
      changeId: 3,
      replace: false,
      state: { bar: 'baz' }
    });

    store.dispatch(replacePath('/bar', { bar: 'foo' }));
    expect(store.getState().routing).toEqual({
      path: '/bar',
      changeId: 4,
      replace: true,
      state: { bar: 'foo' }
    });

    store.dispatch(pushPath('/bar'));
    expect(store.getState().routing).toEqual({
      path: '/bar',
      changeId: 5,
      replace: false,
      state: undefined
    });

    store.dispatch(pushPath('/bar?query=1'));
    expect(store.getState().routing).toEqual({
      path: '/bar?query=1',
      changeId: 6,
      replace: false,
      state: undefined
    });

    store.dispatch(pushPath('/bar?query=1#hash=2'));
    expect(store.getState().routing).toEqual({
      path: '/bar?query=1#hash=2',
      changeId: 7,
      replace: false,
      state: undefined
    });
  });

  it('updates the router even if path is the same', () => {
    const { history, store } = createSyncedHistoryAndStore();
    expect(store.getState().routing).toEqual({
      path: '/',
      changeId: 1,
      replace: false,
      state: undefined
    });

    store.dispatch(pushPath('/foo'));
    expect(store.getState().routing).toEqual({
      path: '/foo',
      changeId: 2,
      replace: false,
      state: undefined
    });

    store.dispatch(pushPath('/foo'));
    expect(store.getState().routing).toEqual({
      path: '/foo',
      changeId: 3,
      replace: false,
      state: undefined
    });

    store.dispatch(replacePath('/foo'));
    expect(store.getState().routing).toEqual({
      path: '/foo',
      changeId: 4,
      replace: true,
      state: undefined
    });
  });

  it('does not update the router for other state changes', () => {
    const { history, store } = createSyncedHistoryAndStore();
    store.dispatch({
      type: 'RANDOM_ACTION',
      value: 5
    });

    expect(store.getState().routing).toEqual({
      path: '/',
      changeId: 1,
      replace: false,
      state: undefined
    });
  });

  it('only updates the router once when dispatching from `listenBefore`', () => {
    const { history, store } = createSyncedHistoryAndStore();
    expect(store.getState().routing).toEqual({
      path: '/',
      changeId: 1,
      replace: false,
      state: undefined
    });

    history.listenBefore(location => {
      expect(location.pathname).toEqual('/foo');
      store.dispatch({
        type: 'RANDOM_ACTION',
        value: 5
      });
    });

    store.dispatch(pushPath('/foo'));
    expect(store.getState().routing).toEqual({
      path: '/foo',
      changeId: 2,
      replace: false,
      state: undefined
    });
  });

  it('allows updating the route from within `listenBefore`', () => {
    const { history, store } = createSyncedHistoryAndStore();
    expect(store.getState().routing).toEqual({
      path: '/',
      changeId: 1,
      replace: false,
      state: undefined
    });

    history.listenBefore(location => {
      if(location.pathname === '/foo') {
        expect(store.getState().routing).toEqual({
          path: '/foo',
          changeId: 2,
          replace: false,
          state: undefined
        });
        store.dispatch(pushPath('/bar'));
      }
      else if(location.pathname === '/replace') {
        expect(store.getState().routing).toEqual({
          path: '/replace',
          changeId: 4,
          replace: false,
          state: { bar: 'baz' }
        });
        store.dispatch(replacePath('/baz', { foo: 'bar' }));
      }
    });

    store.dispatch(pushPath('/foo'));
    expect(store.getState().routing).toEqual({
      path: '/bar',
      changeId: 3,
      replace: false,
      state: undefined
    });

    store.dispatch(pushPath('/replace', { bar: 'baz' }));
    expect(store.getState().routing).toEqual({
      path: '/baz',
      changeId: 5,
      replace: true,
      state: { foo: 'bar' }
    });
  })

  it('throws if "routing" key is missing with default selectRouteState', () => {
    const store = createStore(combineReducers({
      notRouting: routeReducer
    }));
    const history = createHistory();
    expect(
      () => syncReduxAndRouter(history, store)
    ).toThrow(/Cannot sync router: route state does not exist/);
  });

  it('accepts custom selectRouterState', () => {
    const store = createStore(combineReducers({
      notRouting: routeReducer
    }));
    const history = createHistory();
    syncReduxAndRouter(history, store, state => state.notRouting)
    history.pushState(null, '/bar');
    expect(store.getState().notRouting.path).toEqual('/bar');
  });

  it('returns unsubscribe to stop listening to history and store', () => {
    const store = createStore(combineReducers({
      routing: routeReducer
    }));
    const history = createHistory();
    const unsubscribe = syncReduxAndRouter(history, store)

    history.pushState(null, '/foo');
    expect(store.getState().routing.path).toEqual('/foo');

    store.dispatch(pushPath('/bar'));
    expect(store.getState().routing).toEqual({
      path: '/bar',
      changeId: 2,
      replace: false,
      state: undefined
    });

    unsubscribe();

    history.pushState(null, '/foo');
    expect(store.getState().routing.path).toEqual('/bar');

    history.listenBefore(location => {
      throw new Error()
    });
    expect(
      () => store.dispatch(pushPath('/foo'))
    ).toNotThrow();
  });
});

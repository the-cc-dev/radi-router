const version = '0.2.2';

// Pass routes to initiate things
var index = ({
    r,
    l,
    mount,
    headless,
    component,
  }, routes) => {
  let current = {};

  const COLON = ':'.charCodeAt(0);
  const SLASH = '/'.charCodeAt(0);
  var cr, crg, lr, ld;

  const parseRoute = route => {
    var parts = route.split('/'),
      end = [],
      p = [];
    for (var i = 0; i < parts.length; i++) {
      if (COLON === parts[i].charCodeAt(0)) {
        end.push('([^/]+?)');
        p.push(parts[i].substr(1));
      } else if (parts[i] !== '') {
        end.push(parts[i]);
      }
    }
    return [new RegExp('^/' + end.join('/') + '(?:[/])?(?:[?&].*)?$', 'i'), p];
  };

  const parseAllRoutes = arr => {
    var len = arr.length,
      ret = new Array(len);
    for (var i = len - 1; i >= 0; i--) {
      ret[i] = parseRoute(arr[i]);
    }
    return ret;
  };

  const renderError = number => {
    return current.config.errors[number]();
  };

  const writeUrl = url => {
    window.location.hash = url;
    return true;
  };

  const guard = (before, comp, active, last, resolve, reject, deep) => {
    return before(active, last, act => {
      if (typeof act === 'undefined' || act === true) {
        if (typeof deep === 'function') {
          return guard(deep, comp, active, last, resolve, reject, null);
        } else {
          resolve({ default: comp });
        }
      } else if (typeof act === 'string' && act.charCodeAt(0) === SLASH) {
        writeUrl(act);
        return reject();
      } else {
        resolve({ default: renderError(403) });
      }

      // Fire afterEach event in routes
      if (current.after) current.after(active, last);
    });
  };

  const getRoute = curr => {
    if (lr === curr) return ld;
    if (!cr) cr = Object.keys(current.routes);
    if (!crg) crg = parseAllRoutes(cr);
    var cahnged = false;

    for (var i = 0; i < crg.length; i++) {
      if (crg[i][0].test(curr)) {
        ld = new Route(curr, crg[i], current.routes, cr[i]);
        cahnged = true;
        break;
      }
    }

    lr = curr;
    return !cahnged ? { key: null } : ld;
  };

  class Route {
    constructor(curr, match, routes, key) {
      const query = curr
        .split(/[\?\&]/)
        .slice(1)
        .map(query => query.split('='))
        .reduce(
          (acc, key) =>
            Object.assign(acc, {
              [key[0]]: key[1]
            }),
          {}
        );
      var m = curr.match(match[0]);
      this.path = curr;
      this.key = key;
      this.query = query;
      this.cmp = routes[key];
      this.params = this.cmp.data || {};
      for (var i = 0; i < match[1].length; i++) {
        this.params[match[1][i]] = m[i + 1];
      }
    }
  }

  const RouterHead = component({
    name: 'HeadlessRouter',
    state: {
      location: window.location.hash.substr(1) || '/',
      params: {},
      query: {},
      last: null,
      active: null
    },
    actions: {
      onMount(state) {
        window.onhashchange = () => this.hashChange(state);
        this.hashChange(state);
      },

      hashChange(state) {
        state.last = state.active;
        state.location = window.location.hash.substr(1) || '/';
        var a = getRoute(state.location);
        state.params = a.params || {};
        state.query = a.query || {};
        state.active = a.key || '';
        console.log('[radi-router] Route change', a, state.location);
      }
    }
  });

  const Link = component({
    name: 'RouterLink',
    props: {
      to: '/',
      active: 'active'
    },
    view(comp) {
      return r(
        'a',
        {
          href: l(comp, 'to').process(url => '#'.concat(url)),
          class: l(comp, 'to').process(to =>
            l(comp.$router, 'active').process(
              active => (active === to ? 'active' : '')
            )
          )
        },
        ...comp.children
      );
    }
  });

  const Router = component({
    name: 'Router',
    actions: {
      // Triggers when route is chaned
      inject({ active, last }) {
        const RouteComponent = current.routes[active];
        const WillRender =
          typeof RouteComponent === 'object'
            ? RouteComponent.component
            : RouteComponent;

        // Route not found or predefined error
        if (
          (typeof WillRender === 'undefined' ||
            typeof WillRender === 'number' ||
            !WillRender) &&
          typeof RouteComponent === 'undefined'
        )
          return renderError(WillRender || 404);

  			// Plain redirect
  			if (typeof RouteComponent.redirect === 'string')
  	      return writeUrl(RouteComponent.redirect);

        // Check if has any guards to check
        if (
          typeof current.before === 'function' ||
          typeof RouteComponent.before === 'function'
        ) {
          return () =>
            new Promise((resolve, reject) => {
              // Global guard
              if (typeof current.before === 'function') {
                guard(
                  current.before,
                  WillRender,
                  active,
                  last,
                  resolve,
                  reject,
                  RouteComponent.before
                );
              } else if (typeof RouteComponent.before === 'function') {
                guard(
                  RouteComponent.before,
                  WillRender,
                  active,
                  last,
                  resolve,
                  reject,
                  null
                );
              }
            });
        }

        if (typeof WillRender === 'function') {
          // Route is component
          if (WillRender.isComponent && WillRender.isComponent())
            return r(WillRender);

          // Route is plain function
          return WillRender;
        }

        // Route is plain text/object
        return WillRender;
      }
    },
    view(comp) {
      return r(
        'div',
        {},
        l(comp.$router, 'active').process(() => comp.inject(comp.$router)),
        ...comp.children
      );
    }
  });

  const before = routes.beforeEach;
  const after = routes.afterEach;

  current = {
    config: {
      errors: {
        404: () => r('div', {}, 'Error 404: Not Found'),
        403: () => r('div', {}, 'Error 403: Forbidden')
      }
    },
    before,
    after,
    routes: routes.routes,
    write: writeUrl,
    Link,
    Router
  };

  // Initiates router component
  headless('router', RouterHead);

  return current;
};

export default index;
export { version };
//# sourceMappingURL=radi-router.es.js.map
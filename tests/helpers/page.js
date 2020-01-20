const puppeteer = require('puppeteer');

const sessionFactory = require('../factories/sessionFactory');
const userFactory = require('../factories/userFactory');

class Page {
  static async build() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    const custPage = new Page(page);

    return new Proxy(custPage, {
      get: function(target, property) {
        return target[property] || browser[property] || page[property];
      }
    });
  }

  constructor(page) {
    this.page = page;
  }

  async login() {
    const user = await userFactory();
    const { session, sig } = sessionFactory(user);

    await this.page.setCookie({ name: 'session', value: session });
    await this.page.setCookie({ name: 'session.sig', value: sig });

    await this.page.goto('http://localhost:3000/blogs');
    await this.page.waitFor('a[href="/auth/logout"]');
  }

  async getContentsOf(selector) {
    return this.page.$eval(selector, el => el.innerHTML);
  }

  get(url) {
    return this.page.evaluate(_url => {
      return fetch(_url, {
        method: 'GET',
        credentials: 'same-origin'
      }).then(res => res.json());
    }, url);
  }

  post(url, body) {
    return this.page.evaluate(
      (_url, _body) => {
        return fetch(_url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: _body
        }).then(res => res.json());
      },
      url,
      JSON.stringify(body)
    );
  }

  execRequests(actions) {
    const results = Promise.all(
      actions.map(({ method, path, data }) => this[method](path, data))
    );
    return results;
  }
}

module.exports = Page;

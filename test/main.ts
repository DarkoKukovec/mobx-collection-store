// tslint:disable:max-classes-per-file
// tslint:disable:no-string-literal

import {action, autorun, computed, extendObservable, toJS, useStrict} from 'mobx';
useStrict(true);

import {expect} from 'chai';

import {Collection, IPatch, Model} from '../src';

import {assign} from '../src/utils';

describe('MobX Collection Store', () => {
  beforeEach(() => {
    Model.autoincrementValue = 1;
  });

  it('should do the basic init', () => {
    const collection = new Collection();
    expect(collection.find).to.be.a('function');
  });

  it('should use basic models', () => {
    class FooModel extends Model {
      public static type = 'foo';

      public id: number|string;
      public foo: number;
      public bar: number;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];

      public foo: Array<FooModel>;
    }

    const collection = new TestCollection();
    const model = collection.add<FooModel>({
      bar: 0,
      foo: 1,
      fooBar: 0.5,
      id: 1,
    }, 'foo');

    expect(collection.length).to.equal(1);
    expect(collection.foo.length).to.equal(1);
    expect(collection.find<FooModel>('foo', 1)).to.equal(model);
    expect(model.foo).to.equal(1);
    expect(model.bar).to.equal(0);
    expect(model.static.type).to.equal('foo');

    const model2 = new FooModel({
      bar: 1,
    });

    expect(model2.bar).to.equal(1);
    expect(model2.id).to.not.be.an('undefined');
  });

  it('should support nested ids', () => {
    class FooModel extends Model {
      public static type = 'foo';
      public static idAttribute = ['test', 'id'];

      public test: {id: number|string};
      public foo: number;
      public bar: number;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];

      public foo: Array<FooModel>;
    }

    const collection = new TestCollection();
    const model = collection.add<FooModel>({
      bar: 0,
      foo: 1,
      fooBar: 0.5,
      test: {
        id: 1,
      },
    }, 'foo');

    expect(collection.length).to.equal(1);
    expect(collection.foo.length).to.equal(1);
    expect(collection.find<FooModel>('foo', 1)).to.equal(model);
    expect(model.foo).to.equal(1);
    expect(model.bar).to.equal(0);
    expect(model.static.type).to.equal('foo');

    const model2 = collection.add<FooModel>({
      bar: 1,
    }, 'foo');

    expect(model2.bar).to.equal(1);
    expect(model2.test.id).to.not.be.an('undefined');
    expect(model2.test.id).to.not.equal(model.test.id);

    const model3 = collection.find('foo', model2.test.id);
    expect(model3).to.equal(model2);

    const model4 = new FooModel({bar: 321}, {id: 123});
    expect(model4.getRecordId()).to.equal(123);
    expect(model4.getRecordType()).to.equal('foo');

    const model5 = new FooModel({bar: 654}, {id: 456, type: 'bar'});
    expect(model5.getRecordId()).to.equal(456);
    expect(model5.getRecordType()).to.equal('bar');

    const model6 = collection.add<FooModel>({bar: 987}, {id: 789, type: 'foo'});
    expect(model6.getRecordId()).to.equal(789);
    expect(model6.getRecordType()).to.equal('foo');

    const model7 = collection.add<FooModel>({bar: 987}, {id: 0, type: 'baz'});
    expect(model7.getRecordId()).to.equal(0);
    expect(model7.getRecordType()).to.equal('baz');

    const model8 = collection.add<FooModel>({bar: 987}, {type: 'baz'});
    expect(model8.getRecordId()).to.not.be.an('undefined');
    expect(model8.getRecordType()).to.equal('baz');
  });

  it('should support enums for types', () => {
    enum type {
      FOO,
      BAR,
    }

    class FooModel extends Model {
      public static type = type.FOO;

      public id: number|string;
      public foo: number;
      public bar: number;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];
    }

    const collection = new TestCollection();
    const model = collection.add<FooModel>({
      bar: 0,
      foo: 1,
      fooBar: 0.5,
      id: 1,
    }, type.FOO);

    expect(collection.length).to.equal(1);
    expect(collection.findAll(type.FOO).length).to.equal(1);
    expect(collection.find<FooModel>(type.FOO, 1)).to.equal(model);
    expect(model.foo).to.equal(1);
  });

  it('should be able to upsert models', () => {
    class FooModel extends Model {
      public static type = 'foo';

      public foo: number;
      public bar: number;
      public fooBar: number;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];

      public foo: Array<FooModel>;
    }

    const collection = new TestCollection();
    const model = collection.add<FooModel>({
      bar: 0,
      foo: 1,
      fooBar: 0.5,
      id: 1,
    }, 'foo');

    const model2 = collection.add<FooModel>({
      bar: 1,
      foo: 2,
      fooBar: 1.5,
      id: 1,
    }, 'foo');

    expect(collection.length).to.equal(1);
    expect(collection.find('foo', 1)).to.equal(model);
    expect(model.foo).to.equal(2);
    expect(model.bar).to.equal(1);
  });

  it('should support basic relations and serializing', () => {
    class FooModel extends Model {
      public static type = 'foo';
      public static refs = {bar: 'foo', fooBar: 'foo'};

      public foo: number;
      public bar: FooModel;
      public barId: number;
      public fooBar: FooModel;
      public fooBarId: number;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];

      public foo: Array<FooModel>;
    }

    const collection = new TestCollection();
    const model = collection.add<FooModel>({
      bar: 1,
      foo: 0,
      fooBar: 0.5,
      id: 1,
    }, 'foo');

    // Check if the references are ok
    expect(collection.length).to.equal(1);
    expect(collection.find('foo', 1)).to.equal(model);
    expect(model.foo).to.equal(0);
    expect(model.bar).to.equal(model);
    expect(model.barId).to.equal(1);
    expect(model.fooBar).to.equal(null);
    expect(model.fooBarId).to.equal(0.5);
    expect(model.bar.bar).to.equal(model);

    // Clone the collection and check new references
    const collection2 = new TestCollection(collection.toJS());
    const model2 = collection2.find<FooModel>('foo');
    expect(collection2.length).to.equal(1);
    expect(collection2.find('foo', 1)).to.equal(model2);
    expect(model2.foo).to.equal(0);
    expect(model2.bar).to.equal(model2);
    expect(model2.barId).to.equal(1);
    expect(model2.fooBar).to.equal(null);
    expect(model2.fooBarId).to.equal(0.5);
    expect(model2.bar.bar).to.equal(model2);

    // Check if the model is a proper clone
    model.assign('fooBar', 1);
    expect(model.fooBarId).to.equal(1);
    expect(model2.fooBarId).to.equal(0.5);

    // Try to remove a non-existing model
    collection.remove('foo', 2);
    expect(collection.length).to.equal(1);

    // Remove a model and check that it still exists in the cloned collection
    collection.remove('foo', 1);
    expect(collection.length).to.equal(0);
    expect(collection2.length).to.equal(1);

    // Try to remove all models of an unexisting type
    collection2.removeAll('foobar');
    expect(collection2.length).to.equal(1);

    // Remove all models of the foo type
    collection2.removeAll('foo');
    expect(collection2.length).to.equal(0);
  });

  it('should work for the readme example', () => {
    class Person extends Model {
      public static type = 'person';
      public static refs = {spouse: 'person', pets: {model: 'pet', property: 'owner'}};

      public firstName: string;
      public lastName: string;
      public spouse: Person;
      public pets: Array<Pet>;

      @computed public get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
      }
    }

    class Pet extends Model {
      public static type = 'pet';
      public static refs = {owner: 'person'};

      public owner: Person;
      public ownerId: number;
    }

    class MyCollection extends Collection {
      public static types = [Person, Pet];
      public person: Array<Person>;
      public pet: Array<Pet>;
    }

    const collection = new MyCollection();

    const john = collection.add<Person>({
      firstName: 'John',
      id: 1,
      lastName: 'Doe',
      spouse: 2,
    }, 'person');

    const fido = collection.add<Pet>({
      id: 1,
      name: 'Fido',
      owner: john,
    }, 'pet');

    const jane = new Person({
      firstName: 'Jane',
      id: 2,
      lastName: 'Doe',
      spouse: 1,
    });
    collection.add(jane);

    expect(john.spouse.fullName).to.equal('Jane Doe');
    expect(fido.owner.fullName).to.equal('John Doe');
    expect(john.pets.length).to.equal(1);
    expect(fido.owner.spouse.fullName).to.equal('Jane Doe');
    expect(collection.person.length).to.equal(2);
    expect(collection.length).to.equal(3);

    fido.assign('owner', {
      firstName: 'Dave',
      id: 3,
      lastName: 'Jones',
    });

    expect(fido.owner.fullName).to.equal('Dave Jones');
    expect(fido.ownerId).to.equal(3);
    expect(collection.person.length).to.equal(3);
    expect(collection.length).to.equal(4);

    fido.owner = jane;
    expect(fido.owner.fullName).to.equal('Jane Doe');

    expect(collection.length).to.equal(4);
    collection.reset();
    expect(collection.length).to.equal(0);
  });

  it('should support default props', () => {
    class FooModel extends Model {
      public static type = 'foo';
      public static defaults = {
        foo: 4,
      };

      public foo: number;
      public bar: number;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];

      public foo: Array<FooModel>;
    }

    const collection = new TestCollection();

    const model1 = collection.add<FooModel>({
      bar: 0,
      foo: 1,
      fooBar: 0.5,
      id: 1,
    }, 'foo');

    expect(model1.foo).to.equal(1);

    const model2 = collection.add<FooModel>({
      bar: 0,
      fooBar: 0.5,
      id: 2,
    }, 'foo');

    expect(model2.foo).to.equal(4);
  });

  it('should support array refereces', action(() => {
    class FooModel extends Model {
      public static type = 'foo';

      public static refs = {fooBar: 'foo'};

      public id: number;
      public foo: number;
      public bar: number;
      public fooBar: FooModel|Array<FooModel>;
      public fooBarId: number|Array<number>;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];

      public foo: Array<FooModel>;
    }

    const collection = new TestCollection();

    const models = collection.add<FooModel>([{
      foo: 1,
      id: 1,
    }, {
      foo: 2,
      id: 2,
    }, {
      foo: 3,
      id: 3,
    }, {
      foo: 4,
      id: 4,
    }] as Array<object>, 'foo');

    const first = models.shift();
    const second = models.shift();
    expect(collection.length).to.equal(4);

    first.fooBar = models;
    expect(collection.length).to.equal(4);
    expect(first.fooBar).to.have.length(2);
    expect(first.fooBar[1].foo).to.equal(4);
    expect(JSON.stringify(first.fooBarId)).to.equal(JSON.stringify(models.map((model) => model.id)));

    first.fooBar.push(second);
    expect(first.fooBar).to.have.length(3);
    expect(first.fooBar[2].foo).to.equal(2);
  }));

  it('should call autorun when needed', (done) => {
    class FooModel extends Model {
      public static type = 'foo';

      public foo: number;
      public bar: number;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];

      public foo: Array<FooModel>;
    }

    const collection = new TestCollection();

    const model = collection.add<FooModel>({
      bar: 3,
      foo: 1,
      id: 1,
    }, 'foo');

    let runs = 0;
    const expected = [1, 3, 5];
    autorun(() => {
      expect(model.foo).to.equal(expected[runs]);
      runs++;

      if (runs === 3) {
        done();
      }
    });

    model.foo = 3;
    model.bar = 123;
    model.foo = 5;
  });

  it('should support dynamic references', () => {
    class FooModel extends Model {
      public static type = 'foo';

      public foo: number;
    }

    class TestCollection extends Collection {
      public static types = [FooModel];

      public foo: Array<FooModel>;
    }

    const collection = new TestCollection();

    const models = collection.add<FooModel>([{
      foo: 1,
      id: 1,
    }, {
      foo: 2,
      id: 2,
    }, {
      foo: 3,
      id: 3,
    }, {
      foo: 4,
      id: 4,
    }] as Array<object>, 'foo');

    const first = models.shift();

    first.assignRef('bar', models, 'foo');
    expect(first['bar']).to.have.length(3);
    expect(first['bar'][1].foo).to.equal(3);
  });

  it('should support generic references', () => {
    const collection = new Collection();

    const models = collection.add<Model>([{
      foo: 1,
      id: 1,
    }, {
      foo: 2,
      id: 2,
    }, {
      foo: 3,
      id: 3,
    }, {
      foo: 4,
      id: 4,
    }] as Array<object>);

    const first = models.shift();

    first.assignRef('bar', models);
    expect(first['bar']).to.have.length(3);
    expect(first['bar'][1].foo).to.equal(3);
  });

  it('should work with autoincrement', () => {
    class Foo extends Model {
      public static type = 'foo';
      public static idAttribute = 'myID';
      public myID: number;
    }

    class Bar extends Model {
      public static type = 'bar';
      public static enableAutoId = false;
      public id: number;
    }

    class Baz extends Model {
      public static type = 'baz';
      public static autoIdFunction() {
        return Math.random();
      }
      public id: number;
    }

    class TestCollection extends Collection {
      public static types = [Foo, Bar, Baz];
      public foo: Array<Foo>;
    }

    const collection = new TestCollection();

    const foo1 = collection.add<Foo>({bar: 1}, 'foo');
    const foo2 = collection.add<Foo>({bar: 1}, 'foo');
    const foo10 = collection.add<Foo>({myID: 10, bar: 1}, 'foo');
    const foo3 = collection.add<Foo>({bar: 1}, 'foo');
    const foo4 = collection.add<Foo>({myID: 4, bar: 1}, 'foo');
    const foo5 = collection.add<Foo>({bar: 1}, 'foo');

    expect(foo1.myID).to.equal(1);
    expect(foo5.myID).to.equal(5);
    expect(foo4.myID).to.equal(4);
    expect(foo10.myID).to.equal(10);
    expect(collection.foo.length).to.equal(6);

    const bar5 = collection.add<Bar>({id: 5}, 'bar');
    expect(bar5.getRecordId()).to.equal(5);
    expect(() => collection.add<Bar>({foo: 1}, 'bar')).to.throw();

    const baz1 = collection.add<Baz>({}, 'baz');
    expect(baz1.getRecordId()).to.be.within(0, 1);
  });

  it('should support typeAttribute', () => {
    class TestModel extends Model {
      public static typeAttribute = 'foo';
    }

    class TestCollection extends Collection {
      public static types = [TestModel];
    }

    const collection = new TestCollection();

    const model = new TestModel({id: 1, foo: 'bar'});
    collection.add(model);

    const bar = collection.findAll('bar');
    expect(bar.length).to.equal(1);

    const baz = collection.findAll('baz');
    expect(baz.length).to.equal(0);
  });

  it('should handle null references', () => {
    class Foo extends Model {
      public static type = 'foo';
    }

    class TestCollection extends Collection {
      public static types = [Foo];
    }

    const collection = new TestCollection();
    const model = collection.add<Foo>({}, 'foo');
    model.assign('foo', 1);
    model.assignRef('self', model, 'foo');
    model.assignRef('self2', model);
    model.assignRef('empty', null);

    expect(model['self']).to.equal(model);
    expect(model['self2']).to.equal(model);
    expect(model['empty']).to.equal(null);
  });

  it('should support references during collection add', () => {
    class Foo extends Model {
      public static type = 'foo';

      public static refs = {bar: 'bar'};

      public foo: number;
      public bar: Bar|Array<Bar>;
    }

    class Bar extends Model {
      public static type = 'bar';
      public bar: number;
    }

    class TestCollection extends Collection {
      public static types = [Foo, Bar];
      public foo: Array<Foo>;
      public bar: Array<Bar>;
    }

    const collection = new TestCollection();

    const foo = collection.add<Foo>({
      bar: {
        bar: 3,
        id: 4,
      },
      foo: 2,
      id: 1,
    }, 'foo');

    expect(foo.foo).to.equal(2);
    expect(foo.bar['bar']).to.equal(3);
    expect(collection.foo).to.have.length(1);
    expect(collection.bar).to.have.length(1);

    const foo2 = collection.add<Foo>({
      bar: [{
        bar: 8,
        id: 7,
      }, {
        bar: 10,
        id: 9,
      }],
      foo: 6,
      id: 5,
    }, 'foo');

    expect(foo2.bar[0].bar).to.equal(8);
    expect(foo2.bar[1].bar).to.equal(10);
    expect(collection.foo).to.have.length(2);
    expect(collection.bar).to.have.length(3);
  });

  it('should work for a real world scenario', () => {
    class User extends Model {
      public static type = 'user';
      public email: string;
    }

    class Cart extends Model {
      public static type = 'cart';
      public static refs = {user: 'user', products: 'cartItem'};
      public user: User|Array<User>;
      public products: CartItem|Array<CartItem>;
      public id: number;
    }

    class CartItem extends Model {
      public static type = 'cartItem';
      public static refs = {product: 'products'};
      public product: Product|Array<Product>;
      public quantity: number;
      public id: number;
    }

    class Product extends Model {
      public static type = 'products';
      public name: string;
      public price: number;
    }

    class TestCollection extends Collection {
      public static types = [User, Cart, CartItem, Product];
      public user: Array<User>;
      public cart: Array<Cart>;
      public cartItem: Array<CartItem>;
      public products: Array<Product>;
    }

    const collection = new TestCollection();

    const cart = collection.add<Cart>({
      id: 1,
      products: [{
        product: {
          id: 1,
          name: 'Electrons',
          price: 9.99,
        },
        quantity: 8,
      }, {
        product: {
          id: 2,
          name: 'Protons',
          price: 5.99,
        },
        quantity: 2,
      }],
      user: {
        email: 'test@example.com',
        id: 1,
        role: 1,
        token: 'dc9dcd8116673372e96cc0410821da6a',
        username: 'jdoe42',
      },
    }, 'cart');

    expect(collection.user).to.have.length(1);
    expect(collection.cart).to.have.length(1);
    expect(collection.cartItem).to.have.length(2);
    expect(collection.products).to.have.length(2);
    expect(cart.user['email']).to.equal('test@example.com');
    expect(cart.products).to.have.length(2);
    expect(cart.products[0].quantity).to.equal(8);
    expect(cart.products[1].quantity).to.equal(2);
    expect(cart.products[0].product.name).to.equal('Electrons');
  });

  it('should work with preprocess', () => {
    class Foo extends Model {
      public static type = 'foo';
      public static refs = {bar: 'bar'};
      public static preprocess(rawData) {
        return assign({newProp: 1}, rawData);
      }
      public bar: Bar|Array<Bar>;
    }

    class Bar extends Model {
      public static type = 'bar';
      public static preprocess(rawData) {
        return assign({barProp: 2}, rawData);
      }
    }

    class TestCollection extends Collection {
      public static types = [Foo, Bar];
    }

    const collection = new TestCollection();

    const foo = collection.add<Foo>({
      bar: [{
        bar: 8,
        id: 7,
      }, {
        bar: 10,
        id: 9,
      }],
      foo: 6,
      id: 5,
    }, 'foo');

    expect(foo['newProp']).to.equal(1);
    expect(foo.bar[0]['barProp']).to.equal(2);
    expect(foo.bar[1]['barProp']).to.equal(2);
  });

  it('should update an exiting reference', () => {
    class Foo extends Model {
      public static type = 'foo';
      public static refs = {self: 'foo'};

      public self: Foo|Array<Foo>;
      public id: number;
      public foo: number;
    }

    class TestCollection extends Collection {
      public static types = [Foo];
    }

    const collection = new TestCollection();

    const model = collection.add<Foo>({id: 1, foo: 2, self: 1}, 'foo');

    expect(model.self).to.equal(model);

    model.assignRef('self', model);

    expect(model.self).to.equal(model);
  });

  it('should not update a reserved key', () => {
    class Foo extends Model {
      public static type = 'foo';
      public id: number;
      public foo: number;
    }

    class TestCollection extends Collection {
      public static types = [Foo];
    }

    const collection = new TestCollection();
    const model = collection.add<Foo>({id: 1, foo: 2}, 'foo');

    expect(model.assign).to.be.a('function');
    expect(model.id).to.equal(1);
    model.update({id: 2, assign: true, foo: 3} as object);
    expect(model.assign).to.be.a('function');
    expect(model.id).to.equal(1);
    expect(model.foo).to.equal(3);
  });

  it('should suport updating the array items in the reference', action(() => {
    class Foo extends Model {
      public static type = 'foo';
      public static refs = {bar: 'foo'};
      public id: number;
      public foo: number;
      public bar: Foo|Array<Foo>;
    }

    class TestCollection extends Collection {
      public static types = [Foo];
    }

    const collection = new TestCollection();
    const model1 = collection.add<Foo>({id: 1, foo: 2, bar: [1]}, 'foo');
    const model2 = collection.add<Foo>({id: 2, foo: 4, bar: [1, 1, 2]}, 'foo');

    expect(model2.bar[0]).to.equal(model1);
    expect(model2.bar).to.have.length(3);

    model2.bar[0] = model2;
    expect(model2.bar[0]).to.equal(model2);
    expect(model2.bar).to.have.length(3);
  }));

  it('should validate the reference types', action(() => {
    class Foo extends Model {
      public static type = 'foo';
      public static refs = {foo: 'foo'};
      public foo: any; // This would usually be Foo|Array<Foo>, but we need to test the other cases
    }

    class Bar extends Model {
      public static type = 'bar';
    }

    class TestCollection extends Collection {
      public static types = [Foo, Bar];
    }

    const collection = new TestCollection();
    const foo = collection.add<Foo>({id: 1, foo: 1}, 'foo');
    const bar = collection.add<Bar>({id: 2, bar: 3}, 'bar');

    expect(foo.foo).to.equal(foo);

    expect(() => {
      foo.foo = bar;
    }).to.throw();

    expect(foo.foo).to.equal(foo);
  }));

  describe('relationships', () => {
    it('should support many to one/many relationships', () => {
      class Foo extends Model {
        public static type = 'foo';
        public static refs = {bars: {model: 'bar', property: 'fooBar'}};

        public bars: Bar|Array<Bar>;
      }

      class Bar extends Model {
        public static type = 'bar';
        public static refs = {fooBar: 'foo'};

        public fooBar: Foo|Array<Foo>;
      }

      class TestStore extends Collection {
        public static types = [Foo, Bar];
      }

      const store = new TestStore();

      const foo = store.add<Foo>({id: 1, type: 'foo'}, 'foo');
      const bars = store.add<Bar>([{
        fooBar: 1,
        id: 2,
        type: 'bar',
      }, {
        fooBar: 2,
        id: 3,
        type: 'bar',
      }, {
        fooBar: 1,
        id: 4,
        type: 'bar',
      }], 'bar');

      expect(bars).to.have.length(3);
      expect(foo.bars).to.have.length(2);
      expect(foo.bars[0].id).to.equal(2);
      expect(foo.bars[1].id).to.equal(4);
    });

    it('should support relationships to itself', () => {
      class Person extends Model {
        public static type = 'person';
        public static refs = {
          children: {
            model: 'person',
            property: 'parents',
          },
          parents: 'person',
          spouse: 'person',
        };

        public firstName: string;
        public spouse: Person;
        public children: Array<Person>;
        public parents: Person|Array<Person>;
      }

      class Store extends Collection {}
      Store.types = [Person];

      const collection = new Store();
      const steve = collection.add({firstName: 'Steve'}, 'person') as Person;
      const jane = collection.add({firstName: 'Jane'}, 'person') as Person;
      const bob = collection.add({firstName: 'Bob'}, 'person') as Person;
      const john = collection.add({firstName: 'John'}, 'person') as Person;

      steve.spouse = jane;

      bob.parents = [steve, jane];
      john.parents = steve;

      expect(steve.children).to.have.length(2);
      expect(jane.children).to.have.length(1);
    });
  });

  describe('snapshots', () => {
    it('should support snapshots', () => {
      class FooModel extends Model {
        public static type = 'foo';

        public id: number|string;
        public foo: number;
        public bar: number;
      }

      class TestCollection extends Collection {
        public static types = [FooModel];

        public foo: Array<FooModel>;
      }

      const collection = new TestCollection();
      const model = collection.add<FooModel>({
        bar: 0,
        foo: 1,
        fooBar: 0.5,
        id: 1,
      }, 'foo');

      const raw = model.snapshot;
      expect(raw).to.eql({
        bar: 0,
        foo: 1,
        fooBar: 0.5,
        id: 1,
        // tslint:disable-next-line:object-literal-sort-keys
        __type__: 'foo',
      });

      model.foo++;

      expect(raw).to.eql({
        bar: 0,
        foo: 1,
        fooBar: 0.5,
        id: 1,
        // tslint:disable-next-line:object-literal-sort-keys
        __type__: 'foo',
      });

      const raw2 = model.snapshot;
      expect(raw2).to.eql({
        bar: 0,
        foo: 2,
        fooBar: 0.5,
        id: 1,
        // tslint:disable-next-line:object-literal-sort-keys
        __type__: 'foo',
      });

      const rawCollection = collection.snapshot;
      expect(rawCollection).to.eql([{
        bar: 0,
        foo: 2,
        fooBar: 0.5,
        id: 1,
        // tslint:disable-next-line:object-literal-sort-keys
        __type__: 'foo',
      }]);
    });
  });

  describe('insert', () => {
    it('should insert a single item', () => {
      class FooModel extends Model {
        public static type = 'foo';

        public id: number|string;
      }

      class TestCollection extends Collection {
        public static types = [FooModel];

        public foo: Array<FooModel>;
      }

      const model = new FooModel({id: 123});
      const raw = model.toJS();

      const store = new TestCollection();
      const inserted = store.insert(raw) as Array<FooModel>;
      expect(inserted[0].id).to.equal(123);
    });

    it('should insert multiple items', () => {
      class FooModel extends Model {
        public static type = 'foo';

        public id: number|string;
      }

      class TestCollection extends Collection {
        public static types = [FooModel];

        public foo: Array<FooModel>;
      }

      const model1 = new FooModel({id: 123});
      const model2 = new FooModel({id: 456});
      const raw = [model1.toJS(), model2.toJS()];

      const store = new TestCollection();
      const inserted = store.insert(raw) as Array<FooModel>;
      expect(inserted[0].id).to.equal(123);
      expect(inserted[1].id).to.equal(456);
    });

    it('should throw if the data is invalid for a single object', () => {
      const store = new Collection();

      expect(() => store.insert({id: 123})).to.throw();
    });

    it('should throw if the data is invalid for multiple objects', () => {
      const store = new Collection();

      expect(() => store.insert([{id: 123}, {id: 345}])).to.throw();
    });

    it('should throw and not insert anything if any input is invalid', () => {
      class FooModel extends Model {
        public static type = 'foo';

        public id: number|string;
      }

      class TestCollection extends Collection {
        public static types = [FooModel];

        public foo: Array<FooModel>;
      }

      const model = new FooModel({id: 123});
      const raw = model.toJS();

      const store = new TestCollection();
      expect(() => store.insert([raw, {id: 456}])).to.throw();
      expect(store.length).to.equal(0);
    });
  });

  describe('patch', () => {
    describe('model', () => {
      it('should trigger on add, replace and remove', () => {
        const patches = [];
        const model = new Model({
          name: 'Foo',
          nick: 'Bar',
        });

        const unregister = model.patchListen((patch) => patches.push(patch));

        model['name'] = 'FooBar';
        model.assign('age', 42);
        model.unassign('nick');
        model.update({
          height: 180,
          name: 'Bar',
        });

        unregister();
        model['height'] = 200;

        expect(patches).to.eql([{
          oldValue: 'Foo',
          op: 'replace',
          path: '/name',
          value: 'FooBar',
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/age',
          value: 42,
        }, {
          oldValue: 'Bar',
          op: 'remove',
          path: '/nick',
          value: undefined,
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/height',
          value: 180,
        }, {
          oldValue: 'FooBar',
          op: 'replace',
          path: '/name',
          value: 'Bar',
        }]);
      });

      it('should be able to apply patches', () => {
        const model = new Model({
          name: 'Foo',
          nick: 'Bar',
        });

        const patches = [{
          op: 'replace',
          path: '/name',
          value: 'FooBar',
        }, {
          op: 'add',
          path: '/age',
          value: 42,
        }, {
          op: 'remove',
          path: '/nick',
          value: undefined,
        }, {
          op: 'add',
          path: '/height',
          value: 180,
        }, {
          op: 'replace',
          path: '/name',
          value: 'Bar',
        }] as Array<IPatch>;

        patches.map((patch: IPatch) => model.applyPatch(patch));

        expect(model['name']).to.equal('Bar');
        expect(model['height']).to.equal(180);
        expect(model['age']).to.equal(42);
        expect(model['nick']).to.be.an('undefined');
      });
    });

    describe('collection', () => {
      it('should trigger on add, replace and remove', () => {
        const patches = [];
        const model = new Model({
          __type__: 'foo',
          id: 1,
          name: 'Foo',
          nick: 'Bar',
        });

        const store = new Collection();
        store.patchListen((patch) => patches.push(patch));

        store.add(model);

        model['name'] = 'FooBar';
        model.assign('age', 42);
        model.unassign('nick');
        model.update({
          height: 180,
          name: 'Bar',
        });

        store.remove('foo', 1);

        model['height'] = 200;

        expect(patches).to.eql([{
          oldValue: undefined,
          op: 'add',
          path: '/foo/1',
          value: model,
        }, {
          oldValue: 'Foo',
          op: 'replace',
          path: '/foo/1/name',
          value: 'FooBar',
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/foo/1/age',
          value: 42,
        }, {
          oldValue: 'Bar',
          op: 'remove',
          path: '/foo/1/nick',
          value: undefined,
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/foo/1/height',
          value: 180,
        }, {
          oldValue: 'FooBar',
          op: 'replace',
          path: '/foo/1/name',
          value: 'Bar',
        }, {
          oldValue: model,
          op: 'remove',
          path: '/foo/1',
          value: undefined,
        }]);
      });

      it('should be able to apply patches', () => {
        const model = new Model({
          __type__: 'foo',
          id: 1,
          name: 'Foo',
          nick: 'Bar',
        });

        const store = new Collection();

        const patches = [{
          op: 'add',
          path: '/foo/1',
          value: model,
        }, {
          op: 'replace',
          path: '/foo/1/name',
          value: 'FooBar',
        }, {
          op: 'add',
          path: '/foo/1/age',
          value: 42,
        }, {
          op: 'remove',
          path: '/foo/1/nick',
          value: undefined,
        }, {
          op: 'add',
          path: '/foo/1/height',
          value: 180,
        }, {
          op: 'replace',
          path: '/foo/1/name',
          value: 'Bar',
        }, {
          op: 'remove',
          path: '/foo/1',
          value: undefined,
        }] as Array<IPatch>;

        patches.map((patch: IPatch) => store.applyPatch(patch));

        expect(model['name']).to.equal('Bar');
        expect(model['height']).to.equal(180);
        expect(model['age']).to.equal(42);
        expect(model['nick']).to.be.an('undefined');
        expect(store.length).to.equal(0);
      });
    });

    describe('collection with initial data', () => {
      it('should trigger on add, replace and remove', () => {
        const patches = [];

        const store = new Collection([{
          __type__: 'foo',
          id: 1,
          name: 'Foo',
          nick: 'Bar',
        }]);
        store.patchListen((patch) => patches.push(patch));
        const model = store.find('foo');

        model['name'] = 'FooBar';
        model.assign('age', 42);
        model.unassign('nick');
        model.update({
          height: 180,
          name: 'Bar',
        });

        store.remove('foo', 1);

        model['height'] = 200;

        expect(patches).to.eql([{
          oldValue: 'Foo',
          op: 'replace',
          path: '/foo/1/name',
          value: 'FooBar',
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/foo/1/age',
          value: 42,
        }, {
          oldValue: 'Bar',
          op: 'remove',
          path: '/foo/1/nick',
          value: undefined,
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/foo/1/height',
          value: 180,
        }, {
          oldValue: 'FooBar',
          op: 'replace',
          path: '/foo/1/name',
          value: 'Bar',
        }, {
          oldValue: model,
          op: 'remove',
          path: '/foo/1',
          value: undefined,
        }]);
      });

      it('should be able to apply patches', () => {
        const store = new Collection([{
          __type__: 'foo',
          id: 1,
          name: 'Foo',
          nick: 'Bar',
        }]);

        const model = store.find('foo');

        const patches = [{
          op: 'replace',
          path: '/foo/1/name',
          value: 'FooBar',
        }, {
          op: 'add',
          path: '/foo/1/age',
          value: 42,
        }, {
          op: 'remove',
          path: '/foo/1/nick',
          value: undefined,
        }, {
          op: 'add',
          path: '/foo/1/height',
          value: 180,
        }, {
          op: 'replace',
          path: '/foo/1/name',
          value: 'Bar',
        }, {
          op: 'remove',
          path: '/foo/1',
          value: undefined,
        }] as Array<IPatch>;

        patches.map((patch: IPatch) => store.applyPatch(patch));

        expect(model['name']).to.equal('Bar');
        expect(model['height']).to.equal(180);
        expect(model['age']).to.equal(42);
        expect(model['nick']).to.be.an('undefined');
        expect(store.length).to.equal(0);
      });
    });

    describe('references', () => {
      it('should trigger correct patches for ref changes', () => {
        class FooModel extends Model {
          public static type = 'foo';
          public static refs = {bar: 'bar'};

          public id: number|string;
          public bar: BarModel;
        }

        class BarModel extends Model {
          public static type = 'bar';

          public id: number|string;
        }

        class TestCollection extends Collection {
          public static types = [FooModel];

          public foo: Array<FooModel>;
        }

        const bar2 = new BarModel({id: 2});
        const bar3 = new BarModel({id: 3});

        const patches = [];
        const collection = new TestCollection();
        collection.patchListen((patch) => patches.push(patch));
        const model = collection.add<FooModel>({
          bar: bar2,
          id: 1,
        }, 'foo');

        model['bar'] = bar3;
        model['barId'] = 2;
        model['bar'] = null;
        model.assignRef('bar', bar3);

        expect(patches).to.eql([{
          oldValue: undefined,
          op: 'add',
          path: '/bar/2',
          value: bar2,
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/foo/1',
          value: model,
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/bar/3',
          value: bar3,
        }, {
          oldValue: bar2,
          op: 'replace',
          path: '/foo/1/bar',
          value: bar3,
        }, {
          oldValue: bar3,
          op: 'replace',
          path: '/foo/1/bar',
          value: bar2,
        }, {
          oldValue: bar2,
          op: 'remove',
          path: '/foo/1/bar',
          value: undefined,
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/foo/1/bar',
          value: bar3,
        }]);
      });

      it('should apply patches correctly for ref changes', () => {
        class FooModel extends Model {
          public static type = 'foo';
          public static refs = {bar: 'bar'};

          public id: number|string;
          public bar: BarModel;
        }

        class BarModel extends Model {
          public static type = 'bar';

          public id: number|string;
        }

        class TestCollection extends Collection {
          public static types = [FooModel];

          public foo: Array<FooModel>;
        }

        const bar2 = new BarModel({id: 2});
        const bar3 = new BarModel({id: 3});
        const model = new FooModel({id: 1});

        const patches = [{
          oldValue: undefined,
          op: 'add',
          path: '/bar/2',
          value: bar2,
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/foo/1',
          value: model,
        }, {
          oldValue: undefined,
          op: 'add',
          path: '/bar/3',
          value: bar3,
        }, {
          oldValue: null,
          op: 'add',
          path: '/foo/1/bar',
          value: bar3,
        }, {
          oldValue: bar3,
          op: 'replace',
          path: '/foo/1/bar',
          value: bar2,
        }] as Array<IPatch>;

        const collection = new TestCollection();
        patches.map((patch: IPatch) => collection.applyPatch(patch));

        expect(collection.length).to.equal(3);
        expect(model['bar']).to.equal(bar2);
      });
    });
  });

  describe('editing reference arrays', () => {
    it('should be possible to push to a ref array', () => {
      class Foo extends Model {
        public static type = 'foo';
        public static refs = {bar: 'bar'};
        public id: number;
        public bar: Array<Bar>;
        public barId: Array<number>;
      }

      class Bar extends Model {
        public static type = 'bar';
        public id: number;
      }

      class Store extends Collection {
        public static types = [Foo, Bar];
      }

      const store = new Store();

      const foo = store.add<Foo>({id: 1, bar: [{id: 1}, {id: 2}]}, 'foo');

      expect(foo.bar).to.have.length(2);

      const bar3 = store.add<Bar>({id: 3}, 'bar');

      foo.bar.push(bar3);

      expect(foo.bar).to.have.length(3);
      expect(foo.barId).to.have.length(3);
      expect(foo.barId[2]).to.equal(3);
      expect(foo.bar[2].id).to.equal(3);

      const bar4 = store.add<Bar>({id: 4}, 'bar');

      foo.barId.push(4);

      expect(foo.bar).to.have.length(4);
      expect(foo.barId).to.have.length(4);
      expect(foo.bar[3]).to.equal(bar4);

      foo.bar['remove'](bar4);

      expect(foo.bar).to.have.length(3);
      expect(foo.barId).to.have.length(3);
      expect(foo.barId[2]).to.equal(3);

      foo.barId['remove'](3);

      expect(foo.bar).to.have.length(2);

      foo.bar.push({} as Bar);

      expect(foo.bar).to.have.length(3);
      expect(foo.barId).to.have.length(3);
      expect(foo.barId[2]).to.equal(5);
      expect(foo.bar[2].id).to.equal(5);
    });
  });

  describe('Error handling', () => {
    it('Should throw when setting references on a model not in a collection', () => {
      class FooModel extends Model {
        public static type = 'foo';
        public static refs = {bar: 'bar'};

        public id: number|string;
        public bar: BarModel;
      }

      class BarModel extends Model {
        public static type = 'bar';

        public id: number|string;
      }

      const bar = new BarModel({id: 1});

      const foo1 = new FooModel({id: 1});
      expect(foo1).to.be.an('object');

      expect(() => new FooModel({id: 2, bar})).to.throw(Error, 'Model needs to be in a collection to set a reference');
    });
  });
});

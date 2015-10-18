var MongoAdapter = require('./amity-mongodb/lib/amity-mongodb');
var serverService = require('./server-service');

var amity = {

	// This is a placeholder for the Feathers app that is passed to start().
	app: null,

	// The prefix added to all API endpoints that this Amity instance manages.
	// You'll eventually be able to use this for API versioning.
	// TODO: Enable API versioning by setting up each Amity as its own instance.
	apiPrefix: 'api',

	// A list containing host names with ports for each managed server.
	// When adapters are registered with use(), they are added here.
	// This array is sent out when the list of servers is requested.
	serverList: [],

	// The list of the actual connected adapters, keyed by hostname:port.
	// When adapters are registered with use(), they are added here.
	// In the case of replica sets, only the first hostname is used as the key.
	servers: {},

	adapters: {
		// The mongodb adapter comes bundled here for easy reference.
		MongoDB: MongoAdapter
	},

	/**
	 * Register a server store. This is a feathers service that will store
	 * details about configured servers.  Only needs to be used if you
	 * will be storing users and servers separately.
	 */
	setServerConfigStore: function(serverStore) {
		// Set up Amity servers storage.
		if (serverStore) {
			amity.app.use('/api/amity/servers', serverStore);
		} else {
			throw new Error('No storage service was configured for Amity servers.');
		}
	},

	/**
	 * Register a user store. This is a feathers service that will store
	 * authentication details for each user.  Only needs to be used if you
	 * will be storing users and servers separately.
	 */
	setUserConfigStore: function(userStore) {
		// Set up Amity users storage.
		if (userStore) {
			amity.app.use('/api/amity/users', userStore);
		} else {
			throw new Error('No storage service was configured for Amity users.');
		}
	},

	/**
	 * A shortcut function that will use the provided amity adapter to
	 * initialize both the server store and the user store.
	 */
	setConfigStores: function(store) {
		var self = this;

		storeDef.then(function(store) {

			// Make sure the store is a server adapter.
			if (store.scope.toLowerCase() === 'server') {

				// First, set up the adapter.
				self.use(store);

				// Then specify the servers store

				// and finally specify the users store

				// Set up the collections.
				var users = store.users || 'amity_users';
				var servers = store.servers || 'amity_servers';

				// this.setServerConfigStore(store, users);
				// this.setUserConfigStore(store, users);

				// If it wasn't an adapter of scope 'server'...
			} else {
				var message = 'When setting up a serverStore, please ' +
					'provide a SERVER adapter. You have passed a ' +
					store.scope + ' adapter.';
				console.error(message);
			}
		});

		return this;
	},



	/**
	 * Export Amity settings through browser download.
	 *
	 * @return {Object} An object literal containing all stored database settings.
	 *                     Maybe it should be a file...
	 */
	exportConfig: function() {},

	/**
	 * Save a backup copy of stored Amity settings.
	 */
	backupConfig: function() {},


	/**
	 * Set up feathers services on the provided adapter.
	 *
	 * It essentially finds any keys that begin with 'amity_' and loops through
	 * the contained array of key-value pairs, setting up the key as the address
	 * namespace and the value is the service.
	 *
	 * An Amity adapter should already specify what type of feathers service
	 * to put on each object.
	 *
	 * @param  {[type]} adapter - An Amity adapter.
	 * @return {this}
	 */
	use: function(adapter) {
		var self = this;

		// Make sure an object was passed.
		if (typeof adapter !== 'object') {
			console.error('This is not an Amity adapter object.');
		}

		// Put basic information into the server array. This will be public, so only
		// non-sensitive information is allowed.
		var server = {
			name: adapter.namespace,
			endpoint: self.apiPrefix + '/' + adapter.namespace,
			type: adapter.type
		};
		this.serverList.push(server);

		// Add the adapter to the adapters object, keyed by hostname:port
		// In the case of replica sets, only the first hostname is used as the key.
		this.servers[adapter.namespace] = adapter;

		// Connect the adapter.
		adapter.connect(function(err, adapter) {

			// Get the keys that begin with amity_.
			var keys = Object.keys(adapter);
			for (var i = keys.length - 1; i >= 0; i--) {
				if (keys[i].indexOf('amity_') !== 0) {
					keys.splice(i, 1);
				}
			}

			// For each amity_ key...
			keys.forEach(function(key) {
				// Loop through the list of services,
				adapter[key].forEach(function(el) {
					// Build the endpoint address.
					var endpoint = self.apiPrefix + '/' + adapter.namespace + '/' + el.name;
					// And set up each service.
					self.app.use(endpoint, el.service);
				});
			});
		});

		return server;
	},


	/**
	 * Sets up where Amity stores its configuration and settings.
	 * @param  {app} app  The Feathers app - The config services will be
	 *                    set up on the api/amity/... namespace.
	 * @return {Amity Object}  The main Amity instance.
	 */
	start: function(app, config, store, userStore) {

		config.apiPrefix = config.apiPrefix || '/api';

		// Make sure the feathers app was provided.
		if (!app) {
			throw new Error('No Feathers app was provided.');
		}
		this.app = app;

		// If there's only a store passed in...
		if (store && !userStore) {
			// Use it as both the server and user store.
			this.use(store);
		}

		this.app.use('/amity/servers', serverService);

		return this;
	}

};



// External access to the bundled Amity-MongoDB adapter.
exports.Mongodb = require('./amity-mongodb');

module.exports = amity;
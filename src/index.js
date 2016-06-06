"use strict";
import {default as glob} from "glob"
import {default as debug} from "debug"
import {default as Sequelize} from "sequelize"
import {default as Promise} from "bluebird"
import {default as DataTypes} from "sequelize/lib/data-types"
import {default as _} from "babel-polyfill"
import {spawn as spawn} from "child_process"
const DEFAULTCONFIG = {
    "base": "app/model/"
};
const logger = debug("koala-puree-sequelize");

 /**
  *
  */
 class ModelBuilder {
     constructor(sequelize, name, modelDef, app) {
         var self = this;
         self._name = name;
         self._props = {};
         self._pre = {};
         self._modelDef = modelDef;
         this._sequelize = sequelize;
         this._relations = {};
         this._app = app;
         self._settings = {};
     }
     initialize(func) {
         this._initializer = func;
     }
     attr(key, def) {
        //  if (this._schema) {
            //  var props = {};
            //  props[key] = def;
            //  this._schema.add(props);
        //  } else {
        this._props[key] = def;
        //  }
         return this;
     }
     pre(key, func) {
         this._pre[key] = this._pre[key] || [];
         this._pre[key].push(func);
         return this;
     }
     buildschema() {
         var self = this;
        var modelSchema = this._props;
        var classMethods = {};
        var instanceMethods = {};
        var getterMethods = {};
        var setterMethods = {};
         var names = Object.getOwnPropertyNames(this._modelDef);
         for ( let i = 0; i < names.length; i++ ) {
             var name = names[i];
             var property = Object.getOwnPropertyDescriptor(this._modelDef, name);
             if ( require("util").isFunction(property.value)) {
                 // logger(property.value, name);
                 // statics
                 classMethods[name] = property.value;
             }
         }
         classMethods["_omodel"] = instanceMethods["_omodel"] = function(name){
             return self._sequelize.model(name);
         };
         classMethods["_orm"] = instanceMethods["_orm"] = function(){
             return self._sequelize;
         };

         classMethods["_app"] = instanceMethods["_app"] = function(){
             return self._app;
         };

         names = Object.getOwnPropertyNames(this._modelDef.prototype);
         for ( let i = 0; i < names.length; i++ ) {
             // virtuals and methods
           let name = names[i];
           var desc = Object.getOwnPropertyDescriptor(self._modelDef.prototype, name);
           logger(name, desc);
           if ( desc.get || desc.set ) {
             if ( desc.get ) {
               getterMethods[name] = desc.get;
             }
             if ( desc.set ) {
               setterMethods[name] = desc.set;
             }
           } else {
             instanceMethods[name] = desc.value;
           }
         }
        //  var schema = modelSchema;
        //  modelSchema.classMethods = classMethods;
        //  modelSchema.instanceMethods = instanceMethods;

        //  if (this._pre) {
        //      for (let name in this._pre) {
        //          schema.pre(name, (function(name){
        //              return function(done){
        //                  logger("running pre", name, here);
        //                  var here = this;
        //                  function next(i){
        //                      if ( i >= self._pre[name].length ) {
        //                          logger(done);
        //                          return done.call(here);
        //                      }
        //                      return self._pre[name][i].call(here, function(){
        //                          return next(i+1);
        //                      });
         //
        //                  }
        //                  next(0);
        //              };
        //          })(name));
        //      }
        //  }
        //  self._schema = schema;
        self._schema = modelSchema;
        self._settings.getterMethods = getterMethods;
        self._settings.setterMethods = setterMethods;
        self._settings.classMethods = classMethods;
        self._settings.instanceMethods = instanceMethods;
        // modelSchema.classMethods = classMethods;
        // modelSchema.instanceMethods = instanceMethods;
        // var model = self._sequelize.define(self._name, modelSchema, )
         // logger(schema);

        return self._schema;
     }
     build() {

         var self = this;
         logger("building sequelize model now");
         var options = self._settings;
         options.freezeTableName = true;
         logger("now defining model", self._name)
         var model = self._sequelize.define(self._name, self._schema, options)
         return Promise.resolve([self._name, model]);
     }
     beforebuild() {
         var self = this;
     }
     afterbuild() {
       var self = this;
       return new Promise(function(resolve, reject) {
           try {
               if (self._later) {
                   for (var i = 0; i < self._later.length; i++) {
                       self._later[i].call(self);
                   }
                   return resolve();
               }
               resolve();
           } catch (e) {
               logger(e.stack);
               reject(e);
           }
       });
     }
     settings(key, value) {
       this._settings[key] = value;
        //  this.date("updated_at", {
        //      default: Date.now()
        //  });
        //  this.pre("save", function(done) {
        //      if (this._isNew) {
        //          this.created_at = Date.now();
        //      }
        //      this.updated_at = Date.now();
        //      done();
        //  });
        //  this.date("created_at", {
        //      default: Date.now()
        //  });
     }
 }

 for (var type in DataTypes) {
     ModelBuilder.prototype[type.toLowerCase()] = (function(type) {
         return function(name, options) {
             options = options || {};
             options.type = DataTypes[type];
             this.attr(name, options);
         };
     })(type);
 }
 //
 // ModelBuilder.prototype.embeddedlist = function(name, fn) {
 //     this._later = this._later || [];
 //     this._later.push(function(schemas) {
 //         if (require("util").isFunction(fn)) {
 //             this.attr(name, fn(schemas));
 //         } else {
 //             this.attr(name, fn);
 //         }
 //     });
 // };
 //
 // ModelBuilder.prototype.embedded = function(name, fn) {
 //     this._later = this._later || [];
 //     this._later.push(function(schemas) {
 //         if (require("util").isFunction(fn)) {
 //             this.attr(name, fn(schemas));
 //         } else {
 //             this.attr(name, fn);
 //         }
 //     });
 // };

 "hasOne belongsTo belongsToMany hasMany".split(" ").forEach(function(hasType){
     ModelBuilder.prototype[hasType] = function(name, options) {
        //  this._relations[name] = {
        //      clz: name,
        //      type: hasType,
        //      options
        //  };
         var self = this;
        //  var ret = {};
        //  "in out both link".split(" ").forEach(function(type){
        //      ret[type] = function(cond) {
        //          self._relations[name][type] = cond;
        //          self._relations[name].linkType = type;
        //      };
        //  });
        //  return ret;
        self._later = self._later || [];
        self._later.push(()=>{
          var selfModel = self._sequelize.model(self._name);
          var model = self._sequelize.model(name);
          selfModel[hasType](model, options);
        })
     };
 });

 function genModel(file, remove, sequelize, app, builders) {
     var name = require("path").basename(file, ".js");
     remove = remove === undefined ? false : remove;
     var path = file;
     if (remove) {
         delete require.cache[path];
     }
     var modelDef = require(path);

     var builder = new ModelBuilder(sequelize, name, modelDef, app);
     // calling constructor to build
     new modelDef(builder, sequelize);
     if (builders) {
         builders.push(builder);
     }
     return Promise.resolve(builder.buildschema());
 }

 /**
  * This is the middleware generator exported
  */
 module.exports = function SequelizeModelPlugin() {
     /**
      * @class SequelizeModelPlugin
      */
     var obj = {
         /**
          * In general this will setup the model and insert app.Sequelize, app._orm and app.models into koala-puree
          * will also add models into the context of the controller
          * @memberof SequelizeModelPlugin
          * @function setup
          * @static
          */
         setup: function * setupModel(next) {

             var app = this;
             logger(`beginning model middleware`);

             app._orm = obj.getInstance(app);
             app.Sequelize = Sequelize;
             app.ORM = obj;
             app._app.use(function * (next) {
                 logger("adding models to this scope");
                 this.models = app.models;
                 yield * next;
             });
             logger("update");
             var promises = [];
             var builders = [];
             var schemas = {};
             var _config = obj.getConfig(app);
             app.models = {};
            //  var _models = [];
            //  Object.defineProperty(app, models, {
            //    get: function() {
            //      return _models;
            //    }
            //  })
             yield new Promise(function(resolve, reject) {
                 glob(require("path").resolve(app._basePath, _config.base + "*.js"), function(er, files) {
                   console.log("*****************",files);
                     if (er) {
                         return reject(er);
                     }
                     // var schemas = [];

                     for (var f of files) {
                         promises.push(genModel(f, app._app.env !== "production", app._orm, app, builders));
                         // orm.loadCollection(require('waterline').Collection.extend(schema))
                         // schemas.push(schema);
                        //  app.models[name] = context[name];
                         logger(`loading ${f}`);
                     }
                     for (var i = 0; i < builders.length; i++) {
                         schemas[builders[i]._name] = builders[i]._schema;
                     }
                     resolve();
                 });

             }).then(function() {
                 return Promise.all(promises);
             }).then(function(names) {
                 logger("getting all the names", names);
                 return Promise.all(builders.map(function(b) {
                     return b.beforebuild();
                 }));
             }).then(function() {
                 return Promise.all(builders.map(function(b) {
                     return b.build();
                 }));
             }).then(function(models){
               return Promise.all(builders.map(function(b) {
                   return b.afterbuild();
               })).then(()=>{
                 return models;
               });
             }).then(function(models) {
               for (var i = 0; i < models.length; i++) {
                   app.models[models[i][0]] = models[i][1];
               }
             }).catch((e)=>{
               logger("Error while building model", e.stack);
               throw e;
             });
             logger("completed setup");
             yield * next;
             logger("entering after yield");
         },
         teardown: function*(next) {
             logger("middleware tearing down");
             yield* next;
             logger("middleware torn");
         },
         getConfig: function(app) {
             var config = require("extend")({}, DEFAULTCONFIG, {
                 connection: {}
             });
             var _config = app._config.db || {};
             _config.username = _config.username || "root";
            //  _config.password = (_config.password === undefined) || "root";

             if (!_config.database) {
                 throw "server.yml#db.database has to be provided e.g. mysql://localhost:3306/test";
             }
             if (!_config.dialect) {
                 throw "server.yml#db.dialect has to be provided e.g. mysql";
             }
             _config.logger = logger;
             config.connection = _config;
             logger("config retrieved for applicatin", config);
             return config;
         },
         getManager: function(app){
             throw "Not implemented, please use sequelize-cli";
         },
         createMigration: function(app, name) {

         },
         migrate: function(app) {

         },
         rollback: function(app) {

         },
         seed: function(app) {

         },
         getInstance: function(app) {
           try {
               logger("Creating sequelize");
               var dbConfig = obj.getConfig(app);
               logger("Using this dbConfig", dbConfig);
               var orm = new Sequelize(dbConfig.connection.database, dbConfig.connection.username, dbConfig.connection.password, dbConfig.connection);
               logger("sequelize created");
               return orm;
           } catch (e) {
               logger("failed to create sequelize", e, e.stack);
               throw e;
           }
         }
     };
     return obj;
 };

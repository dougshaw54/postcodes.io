"use strict";

const helper = require("./helper");
const { assert } = require("chai");
const { Base, csvExtractor } = require("../app/models/base.js");
const spdSchemaLarge = require("../data/spd_large_schema.json");
const spdSchemaSmall = require("../data/spd_small_schema.json");
const onspdSchema = require("../data/onspd_schema.json");

describe("Base model", function() {
  describe("Base model instance methods", function() {
    describe("#_query", function() {
      it("should execute a query", function(done) {
        const base = new Base();
        base._query("SELECT * FROM pg_tables", function(error, result) {
          if (error) return done(error);
          assert.isArray(result.rows);
          done();
        });
      });
    });
  });

  describe("CRUD methods", function() {
    var customRelation;

    before(function(done) {
      customRelation = helper.getCustomRelation();
      customRelation._createRelation(done);
    });

    after(function(done) {
      customRelation._destroyRelation(done);
    });

    describe("#_create", function() {
      it("should return an error if property no in schema", function(done) {
        customRelation._create(
          {
            bogus: "bogusfield",
          },
          function(error, result) {
            assert.match(error.message, /Could not create record/);
            done();
          }
        );
      });
      it("should create a new record", function(done) {
        customRelation._create(
          {
            somefield: "unique",
          },
          function(error, result) {
            if (error) return done(error);
            done();
          }
        );
      });
    });

    describe("#all", function() {
      it("should return list of all records", function(done) {
        customRelation.all(function(error, result) {
          if (error) return done(error);
          var containsUnique = result.rows.some(function(elem) {
            return elem.somefield === "unique";
          });
          assert.isTrue(result.rows.length > 0);
          assert.isTrue(containsUnique);
          done();
        });
      });
    });
  });

  describe("#_createRelation", function() {
    var customRelation;

    before(function() {
      customRelation = helper.getCustomRelation();
    });

    it("should create a table with the right attributes", function(done) {
      customRelation._createRelation(function(error, result) {
        if (error) return done(error);
        done();
      });
    });

    after(function(done) {
      customRelation._destroyRelation(function(error, result) {
        if (error) return done(error)();
        done();
      });
    });
  });

  describe("#_destroyRelation", function() {
    var customRelation;

    before(function(done) {
      customRelation = helper.getCustomRelation();
      customRelation._createRelation(function(error, result) {
        if (error) return done(error);
        done();
      });
    });

    it("should delete the relation", function(done) {
      customRelation._destroyRelation(function(error, result) {
        if (error) return done(error);
        done();
      });
    });
  });

  describe("#_csvSeed", done => {
    let customRelation;

    before(done => {
      customRelation = helper.getCustomRelation();
      customRelation._createRelation(done);
    });

    after(done => customRelation._destroyRelation(done));

    it("should seed the relation table with data", done => {
      customRelation._csvSeed(
        {
          filepath: helper.seedPaths.customRelation,
          columns: "someField",
        },
        (error, result) => {
          if (error) return done(error);
          customRelation.all((error, data) => {
            if (error) return done(error);
            var hasLorem = data.rows.some(function(elem) {
              return elem.somefield === "Lorem";
            });
            assert.isTrue(hasLorem);
            done();
          });
        }
      );
    });
  });

  describe("#clear", function(done) {
    var customRelation;

    before(done => {
      customRelation = helper.getCustomRelation();
      customRelation._createRelation((error, result) => {
        if (error) return done(error);
        customRelation._csvSeed(
          {
            filepath: helper.seedPaths.customRelation,
            columns: "someField",
          },
          (error, result) => {
            if (error) return done(error);
            customRelation.all((error, data) => {
              if (error) return done(error);
              assert.isTrue(data.rows.length > 0);
              done();
            });
          }
        );
      });
    });

    after(done => customRelation._destroyRelation(done));

    it("should clear the table", function(done) {
      customRelation.clear(function(error, result) {
        if (error) return done(error);
        customRelation.all(function(error, data) {
          if (error) return done(error);
          assert.equal(data.rows.length, 0);
          done();
        });
      });
    });
  });

  describe("csvExtractor", () => {
    it("generates function that extracts correct ONSPD val from row", () => {
      const row = ["foo", "bar", "baz"];
      const extract = csvExtractor(onspdSchema);
      assert.equal(extract(row, "pcd"), "foo");
      assert.equal(extract(row, "pcd2"), "bar");
      assert.equal(extract(row, "pcds"), "baz");
    });

    it("generates function that extracts correct SPD val from row", () => {
      const row = ["foo", "bar", "baz", "date"];

      const extract = csvExtractor(spdSchemaSmall);
      assert.equal(extract(row, "Postcode", "spd"), "foo");
      assert.equal(extract(row, "DateOfIntroduction", "spd"), "date");
    });

    it("extracts correct SPD val from row when large specified", () => {
      let row = new Array(15);
      row[14] = "yes";
      const extract = csvExtractor(spdSchemaLarge);
      assert.equal(
        extract(row, "ScottishParliamentaryConstituency2014Code"),
        "yes"
      );
    });
  });
});

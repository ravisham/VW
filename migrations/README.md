#DB commands
psgl -h pg-db.visionwheel.mirum.la visionwheeldealers_qa -U postgres_admin -P pCZJlJFCz3

pg_dump -h pg-db.visionwheel.mirum.la -U postgres_admin visionwheeldealers_qa > vw.qa.sql
pg_dump -h pg-db.visionwheel.mirum.la -U postgres_admin visionwheeldealers > vw.prod.sql

psql -U postgres vw < vw.prod.sql

#also ignore anything below. it was written by a crazy person.



# vision-wheel-migrations

Migration for VW Postgres Database.

I will update this README with more details on how to use this migration process properly. It should be very simple but must understand what happens under the hood.

## Usage

You must specify your database connection url by setting the environment variable `DATABASE_URL`.
If a .env file exists, it will be loaded using [dotenv](https://github.com/motdotla/dotenv) when running the pg-migrate binary.

Depending on your project's setup, it may make sense to write some custom grunt tasks that set this env var and run your migration commands. More on that below.

**The following are the available commands:**

- `pg-migrate create {migration-name}` - creates a new migration file with the name you give it. Spaces and underscores will be replaced by dashes and a timestamp is prepended to your file name.
- `pg-migrate up` - runs all up migrations from the current state.
- `pg-migrate up {N}` - runs N up migrations from the current state.
- `pg-migrate down` - runs a single down migration.
- `pg-migrate down {N}` - runs N down migrations from the current state.

### Configuration

You can adjust defaults by passing arguments to `pg-migrate`:

* `database-url-var` (`d`) - Name of env variable with database url string (defaults to `DATABASE_URL`)
* `migrations-dir` (`m`) - The directory containing your migration files (defaults to `migrations`)
* `migrations-table` (`t`) - The table storing which migrations have been run (defaults to `pgmigrations`)

See all by running `pg-migrate --help`.


## Defining Migrations

When you run `pg-migrate create` a new migration file is created that looks like this:

```javascript
exports.up = function(pgm){

}
exports.down = function(pgm){

}
```

`pgm` is a helper object that provides migration operations and `run` is the callback to call when you are done.

**IMPORTANT**
Calling the migration functions on `pgm` doesn't actually migrate your database. These functions just add sql commands to a stack that is run.

#### Automatic Down Migrations

If `exports.down` is not present in a migration, pg-migrate will try to automatically infer the operations that make up the down migration by reversing the operations of the up migration. Only some operations have automatically inferrable equivalents (details below on each operation). Sometimes, migrations are destructive and cannot be rolled back. In this case, you can set `exports.down = false` to tell pg-migrate that the down migration is impossible.

#### Async Migrations

In some cases, you may want to perform some async operation during a migration, for example fetching some information from an external server, or inserting some data into the database. To make a migration block operate in async mode, just add another callback argument to the function signature. However, be aware that NONE of the pgm operations will be executed until `run()` is called. Here's an example:

```javascript
exports.up = function(pgm, run){
  doSomethingAsync(function(){
    run();
  });
}
```



## Migration methods

The `pgm` object that is passed to each up/down block has many different operations available. Each operation is simply a function that generates some sql and stores it in the current pgm context.

By default, each migration will be run in a transaction. To disable transactions for a specific migration, call `pgm.noTransaction()`
This is required for some SQL operations that cannot be run within a transaction. It should be used carefully.

### Creating & Altering Tables / Columns

#### `pgm.createTable( tablename, columns, options )`

> Create a new table - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-createtable.html)

**Arguments:**
- `tablename` _[string]_ - name for the new table
- `columns` _[object]_ - column names / options -- see [column definitions section](#column-definitions)
- `options` _[object]_ - table options (optional)
  - `inherits` _[string]_ - table to inherit from

**Reverse Operation:** `dropTable`

-----------------------------------------------------

#### `pgm.dropTable( tablename )`

> Drop existing table - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-droptable.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to drop

-----------------------------------------------------

#### `pgm.renameTable( tablename, new_tablename )`

> Rename a table - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-altertable.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to rename
- `new_table` _[object]_ - new name of the table

**Reverse Operation:** same operation in opposite direction

-----------------------------------------------------

#### `pgm.addColumns( tablename, new_columns )`

> Add columns to an existing table - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-altertable.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to alter
- `new_columns` _[object]_ - column names / options -- see [column definitions section](#column-definitions)

**Aliases:** `addColumn`
**Reverse Operation:** `dropColumns`

-----------------------------------------------------

#### `pgm.dropColumns( tablename, columns )`

> Drop columns from a table - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-altertable.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to alter
- `columns` _[array of strings or object]_ - columns to drop (if object, uses keys)

**Aliases:** `dropColumn`

-----------------------------------------------------

#### `pgm.renameColumn( tablename, old_column_name, new_column_name )`

> Rename a column - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-altertable.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to alter
- `old_column_name` _[string]_ - current column name
- `new_column_name` _[string]_ - new column name

**Reverse Operation:** same operation in opposite direction

-----------------------------------------------------

#### `pgm.alterColumn( tablename, column_name, column_options )`

> Alter a column (default value, type, allow null) - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-altertable.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to alter
- `column_name` _[string]_ - column to alter
- `column_options` _[object]_ - optional new column options
  - `default` _[string or null]_ - null, string
  - `type` _[string]_ - new datatype
  - `notNull` _[boolean]_ - sets NOT NULL if true

-----------------------------------------------------

#### `pgm.addConstraint( tablename, constraint_name, expression )`

> Add a named column constraint - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-altertable.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to alter
- `constraint_name` _[string]_ - name for the constraint
- `expression` _[string]_ - constraint expression (raw sql)

**Aliases:** `createConstraint`
**Reverse Operation:** `dropConstraint`

-----------------------------------------------------

#### `pgm.dropConstraint( tablename, constraint_name )`

> Drop a named column constraint - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-altertable.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to alter
- `constraint_name` _[string]_ - name for the constraint

-----------------------------------------------------

#### `pgm.createIndex( tablename, columns, options )`

> Create a new index - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-createindex.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to alter
- `columns` _[string or array of strings]_ - columns to add to the index
- `options` _[index options]_ - optional options:
  - `name` _[string]_ - name for the index (one will be inferred from table/columns if undefined)
  - `unique` _[boolean]_ - set to true if this is a unique index
  - `where` _[string]_ - raw sql for where clause of index
  - `concurrently` _[boolean]_ - create this index concurrently
  - `method` _[string]_ - btree | hash | gist | spgist | gin

**Aliases:** `addIndex`
**Reverse Operation:** `dropIndex`

-----------------------------------------------------

#### `pgm.dropIndex( tablename, columns, options )`

> Drop an index - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-dropindex.html)

**Arguments:**
- `tablename` _[string]_ - name of the table to alter
- `columns` _[string or array of strings]_ - column names, used only to infer an index name
- `options` _[index options]_ - optional options:
  - `name` _[string]_ - name of the index to drop

-----------------------------------------------------

### Miscellaneous Operations

#### `pgm.sql( sql )`

> Run raw sql -- with some optional _[very basic](http://mir.aculo.us/2011/03/09/little-helpers-a-tweet-sized-javascript-templating-engine/)_ mustache templating

**Arguments:**
- `sql` _[string]_ - name(s) of extensions to install
- `args` _[object]_ - (optional) key/val of arguments to replace

**Aliases:** `addExtension`
**Reverse Operation:** `dropExtension`

-----------------------------------------------------

#### `pgm.createExtension( extension )`

> Install postgres extension(s) - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-createextension.html.html)

**Arguments:**
- `extension` _[string or array of strings]_ - name(s) of extensions to install

**Aliases:** `addExtension`
**Reverse Operation:** `dropExtension`

-----------------------------------------------------

#### `pgm.dropExtension( extension )`

> Un-install postgres extension(s) - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-dropextension.html)

**Arguments:**
- `extension` _[string or array of strings]_ - name(s) of extensions to install

-----------------------------------------------------

#### `pgm.createType( type_name, values )`

> Create a new enum data type - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-createtype.html)

**Arguments:**
- `type_name` _[string]_ - name of the new type
- `values` _[array of strings]_ - possible values

**Aliases:** `addType`
**Reverse Operation:** `dropType`

-----------------------------------------------------

#### `pgm.dropType( type_name )`

> Drop a custom data type - [postgres docs](http://www.postgresql.org/docs/9.3/static/sql-droptype.html)

**Arguments:**
- `type_name` _[string]_ - name of the new type

-----------------------------------------------------

### Column Definitions

The `createTable` and `addColumns` methods both take a `columns` argument that specifies column names and options. It is a object (key/value) where each key is the name of the column, and the value is another object that defines the options for the column.

- `type` _[string]_ - data type (use normal postgres types)
- `unique` _[boolean]_ - set to true to add a unique constraint on this column
- `primaryKey` _[boolean]_ - set to true to make this column the primary key
- `notNull` _[boolean]_ - set to true to make this column not null
- `check` _[string]_ - sql for a check constraint for this column
- `references` _[string]_ - a table name that this column is a foreign key to
- `onDelete` _[string]_ - adds ON DELETE constraint for a reference column
- `onUpdate` _[string]_ - adds ON UPDATE constraint for a reference column

#### Data types & Convenience Shorthand
Data type strings will be passed through directly to postgres, so write types as you would if you were writing the queries by hand.

**There are some aliases on types to make things more foolproof:**
_(int, string, float, double, datetime, bool)_

**There is a shorthand to pass only the type instead of an options object:**
`pgm.addColumns('myTable', { age: 'integer' });`
is equivalent to
`pgm.addColumns('myTable', { age: { type: 'integer' } });`

**There is a shorthand for normal auto-increment IDs:**
`pgm.addColumns('myTable', { id: 'id' });`
is equivalent to
`pgm.addColumns('myTable', { id: { type: 'serial', primaryKey: true } });`

### Using schemas

Instead of passing string as name to `pgm` functions, you can pass an object with keys `schema` and `name`. E.g.

`pgm.createTable( {schema: 'my_schema', name: 'my_table_name'}, {id: 'serial'});`

will generate

```sql
CREATE TABLE "my_schema"."my_table_name" (
 "id" serial
);
```


## Explanation & Goals

*Why only Postgres?* - By writing this migration tool specifically for postgres instead of accommadating many databases, we can actually provide a full featured tool that is much simpler to use and maintain. I was tired of using crippled database tools just in case one day we switch our database.

*Async / Sync* - Everything is async in node, and that's great, but a migration tool should really just be a fancy wrapper that generates SQL. Most other migration tools force you to bring in control flow libraries or wrap everything in callbacks as soon as you want to do more than a single operation in a migration. Plus by building up a stack of operations, we can automatically infer down migrations (sometimes) to save even more time.

*Naming / Raw Sql* - Many tools force you to use their constants to do things like specify data types. Again, this tool should be a fancy wrapper that generates SQL, so whenever possible, it should just pass through user values directly to the SQL. The hard part is remembering the syntax of the specific operation, not remembering how to type "timestamp"!
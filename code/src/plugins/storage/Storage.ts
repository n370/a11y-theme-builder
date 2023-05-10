import { FastifyInstance } from 'fastify';
import { join } from 'path';
// @ts-ignore
import tingodb from 'tingodb';

export default class Storage {
  private _dbName: string = "themes"
  private _db: any
  private _collection: any

  constructor(private _opts: { logger: FastifyInstance['log'] }) {}

  public async connect() {
    const Engine = tingodb()
    this._db = new Engine.Db(join(__dirname, '..', '..', '..', 'src', 'data'), {});
    this._collection = this._db.collection(this._dbName);
    return new Promise((resolve) => {
      this._collection.compactCollection((a: unknown, b: unknown) => {
          this._opts.logger.info(`compactCollection a=${a} b=${b}`);
          resolve(undefined)
      });
    })
  }

  // Get all theme objects
  public async getDocs(match?: any): Promise<any[]> {
    this._opts.logger.info(`getDocs()`);
    return new Promise((success:any, fail:any) => {
        this._collection.find(match).toArray(function(err:any, items:any) {
            if (items) {
                // this._opts.logger.info("  items=",items);
                const rtn: any = [];
                for (let doc of items) {
                    delete doc["_id"];
                    rtn.push(doc);
                }
                return success(rtn);
            }
            if (err) {
                return fail(new DocError(500, err.message));
            }
            return fail(new DocError(404, `no documents were found`));
        })
    });
  }

  // Get theme for id
  public async getDoc(id: string, fields?: string[]): Promise<any> {
    this._opts.logger.info(`getDoc(${id}, ${JSON.stringify(fields)})`);
    const match = {id: id}
    let _fields:any = null;
    if (fields) {
        _fields = {};
        for (var _field of fields) {
            _fields[_field] = true;
        }
    }
    return new Promise((success:any, fail:any) => {
        this._collection.findOne(match, _fields, function(err:any, item:any) {
            if (item) {
                delete item["_id"];
                return success(item);
            }
            if (err) {
                return fail(new DocError(500, err));
            }
            return fail(new DocError(404, `document '${JSON.stringify(id)}' was not found`));
        })
    });
  }

  // Get metadata for all theme objects
  public async getMetadata(match?: any): Promise<any[]> {
    this._opts.logger.info(`getMetadata()`);
    const fields = { id:1, metadata:1};
    return new Promise((success:any, fail:any) => {
        this._collection.find(match, fields).toArray(function(err:any, items:any) {
            if (items) {
                const rtn: any = [];
                for (let doc of items) {
                    delete doc["_id"];
                    rtn.push(doc);
                }
                return success(rtn);
            }
            if (err) {
                return fail(new DocError(500, err.message));
            }
            return fail(new DocError(404, `no documents were found`));
        })
    });
  }

  // Get all theme names
  public async getDocNames(match?: any): Promise<any[]> {
    this._opts.logger.info(`getDocNames()`);
    return new Promise((success:any, fail:any) => {
        this._collection.find(match, { id: 1 }).toArray((err:any, items:any) => {
            if (items) {
                this._opts.logger.info("  items=",items);
                const rtn: any = [];
                for (let doc of items) {
                    rtn.push(doc.id);
                }
                return success(rtn);
            }
            if (err) {
                return fail(new DocError(500, err.message));
            }
            return fail(new DocError(404, `no documents were found`));
        })
    });
  }

  // Create theme
  public async createDoc(doc: any): Promise<any> {
    this._opts.logger.info(`createDoc(${doc.id})`);
    if (!doc || !doc.id) {
        throw new DocError(501, `invalid document`);
    }
    return new Promise(async (success:any, fail:any) => {
            try {
                const exists = await this.getDoc(doc.id);
                this._opts.logger.info(" exists=",exists);
                return fail(new DocError(502, `document already exists`));
            }
            catch (e) {
            }
            this._collection.insert(doc, (err:any, item:any) => {
            if (item) {
                this._opts.logger.info("  create doc=",item);
                if (item.length > 0) {
                    delete item[0]["_id"];
                    return success(item[0]);
                }
            }
            if (err) {
                return fail(new DocError(500, err.message));
            }
            return fail(new DocError(404, `document '${JSON.stringify(doc.id)}' was not found`));
        })
    })
  }

  // Delete database
  public async deleteDocs(): Promise<any> {
    this._opts.logger.info(`deleteDocs()`);
    return new Promise((success:any, fail:any) => {
        this._collection.drop(() => {
            this._opts.logger.info("  database dropped");
            this._collection = this._db.collection(this._dbName);
            success(true);
        })
    })
  }

  // Update theme
  public async updateDoc(id: string, doc: any, returnDoc?: boolean): Promise<any> {
    this._opts.logger.info(`updateDoc(${id}, ${JSON.stringify(doc)}, ${returnDoc})`);
    return new Promise((success:any, fail:any) => {
        if (doc.id) {
            if (doc.id != id) {
                return fail(new DocError(501, `invalid document`));
            }
        }
        else {
            let found = false;
            for (var key of Object.keys(doc)) {
                if (key.startsWith("$")) {
                    found = true;
                    break;
                }
            }
            // Only add id if no update operator (Note: Still seems to work correctly even if $set)
            if (!found) {
                doc.id = id;
            }
        }
        this._collection.update({id: id}, doc, (err:any, item:any) => {
            if (item) {
                this._opts.logger.info("  update doc=",item);
                if (returnDoc) {
                    const r = this.getDoc(id);
                    return success(r);
                }
                return success(true);
            }
            if (err) {
                return fail(new DocError(500, err.message));
            }
            return fail(new DocError(404, `document '${JSON.stringify(id)}' was not found`));
        })
    });
  }

  // Delete theme
  public async deleteDoc(id:string): Promise<any> {
    this._opts.logger.info(`deleteDoc(${id})`);
    return new Promise(async (success:any, fail:any) => {
        let doc:any;
        try {
            doc = await this.getDoc(id);
        } catch (e) {
            fail(e);
        }
        this._collection.remove({id: id}, (err:any, item:any) => {
            if (item) {
                this._opts.logger.info("  delete doc=", item);
                return success(doc);
            }
            if (err) {
                return fail(new DocError(500, err));
            }
            return fail(new DocError(404, `document '${JSON.stringify(doc.id)}' was not found`));
        })
    })
  }
}

export class DocError extends Error {
  public readonly scode: number;
  constructor(scode: number, msg: string) {
      super(msg);
      this.scode = scode;
  }
}

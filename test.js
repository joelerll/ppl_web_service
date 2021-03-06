const path = require('path')
const fs = require('fs')
const sinon = require('sinon')
const chai    = require('chai')
const expect = require('chai').expect
const jsonfile = require('jsonfile')
const chaiXml = require('chai-xml')
const Ajv = require('ajv')
const validator = require('validator')
require('mocha-sinon')
const logger = require('tracer').console()
const ajv = new Ajv({$data: true})
const jsondiffpatch = require('jsondiffpatch').create({
  arrays: {
    detectMove: true,
    includeValueOnMove: true
  }
})

chai.use(chaiXml)

const WSPPL = require('./app')
const dump = require('./dump')
const config = require('./config')
const schema = require('./json.schema')
const dumpFolder = path.join(__dirname, './dump')

const dbMock = {
  	crearEstudiante({ nombres, apellidos, correo, matricula, paralelo,  codigoMateria }) { // null si no se creo o lo que sea?. Aqui se debe implementar cosas extras como ingresarlo a grupo
  	  return Promise.resolve({ nombres, apellidos, correo, matricula, paralelo,  codigoMateria })
  	},
  	crearProfesor({ nombres, apellidos, correo, tipo, paralelo, codigoMateria }) {
  	  return Promise.resolve({ nombres, apellidos, correo, tipo, paralelo, codigoMateria })
  	},
  	crearParalelo({ codigoMateria, nombreMateria, paralelo}) {
      return Promise.resolve({ codigoMateria, nombreMateria, paralelo})
  	},
  	eliminarEstudiante({ estudianteIdentificador }) { // tiene que moverse de paralelo y vera que hace el que la implementa
      return Promise.resolve(true)
  	},
  	cambiarEstudianteParalelo({ paraleloNuevo ,estudianteIdentificador }) {
      return Promise.resolve(true)
  	},
    cambiarNombresEstudiante({ nombresNuevo, estudianteIdentificador}) {
      return Promise.resolve(true)
    },
    cambiarApellidosEstudiante({ nombresNuevo, estudianteIdentificador}) {
      return Promise.resolve(true)
    },
    cambiarCorreoEstudiante({ correoNuevo, estudianteIdentificador}) {
      return Promise.resolve(true)
    },
    paralelos({}) {
      return Promise.resolve(dump.paralelos[0])
    }
}

const wsPPL = WSPPL({ config, db: dbMock, logger })

describe('PPL WEB SERVICE', () =>  {
  beforeEach(function(done) {
    this.sinon.stub(logger, 'error')
    this.sinon.stub(logger, 'info')
    done()
  })

  // OBTENER LOS RAW DE LA WEB SERVICE, es necesario el uso de internet
  it('@t1 OBTENER RAW ESTUDIANTES', (done) => {
  	let argumentosEstudiantes = {
  		anio: config.anioDesde,
		  termino: config.termino.primer,
		  paralelo: config.paraleloDesde,
		  codigomateria: config.materiaCodigo.fisica2
  	}
  	let metodoEstudiantes = config.metodos.estudiantes
    wsPPL.obtenerRaw({ argumentos: argumentosEstudiantes, metodo: metodoEstudiantes }).then((resp) => {
      expect(resp).xml.to.be.valid()
      done()
    })
  })

  it('@t2 OBTENER RAW PROFESOR', (done) => {
  	let argumentosProfesores = {
      anio: config.anioDesde,
      termino: config.termino.primer,
      paralelo: config.paraleloDesde,
      codigomateria: config.materiaCodigo.fisica2,
      tipo: config.tiposProfesor.peer,
    }
    let metodoProfesores = config.metodos.profesores
    wsPPL.obtenerRaw({ argumentos: argumentosProfesores, metodo: metodoProfesores }).then((resp) => {
      expect(resp).xml.to.be.valid()
      done()
    })
  })

  describe('@t3 CONVERTIR XML A JSON LOS ESTUDIANTES', () =>  {
  	it('@t3.1 OK', (done) => {
  	  const estudiantesDump = dump.estudiantesWSDL.raw
  	  const cantidadEstudiantesDump = dump.estudiantesWSDL.cantidad
      const estudiantes = wsPPL.generarJsonEstudiante({ raw: estudiantesDump })
      expect(estudiantes).to.have.lengthOf(cantidadEstudiantesDump)
      expect(estudiantes).to.be.an('array')
      expect(ajv.validate(schema.estudiantes, estudiantes)).to.equal(true)
      done()
  	})
  	it('@t3.2 VACIO', (done) => {
  	  const estudiantesDump = dump.estudiantesWSDL.vacio
  	  const vacio = 0
      const estudiantes = wsPPL.generarJsonEstudiante({ raw: estudiantesDump })
      expect(estudiantes).to.have.lengthOf(vacio)
      expect(estudiantes).to.be.an('array')
      done()
  	})
  })

  describe('@t4 CONVERTIR XML A JSON LOS PROFESORES', () =>  {
  	it('@t4.1 OK TITULAR', (done) => {
  	  const profesorDump = dump.profesorTitularWSDL.raw
      const profesor = wsPPL.generarJsonProfesor({ raw: profesorDump, tipo: 'titular' })
      expect(ajv.validate(schema.profesor, profesor)).to.equal(true)
      done()
  	})
  	it('@t4.2 OK PEER', (done) => {
  	  const profesorDump = dump.profesorTitularWSDL.raw
      const profesor = wsPPL.generarJsonProfesor({ raw: profesorDump, tipo: 'peer' })
      expect(ajv.validate(schema.profesor, profesor)).to.equal(true)
      done()
  	})
  	it('@t4.3 VACIO', (done) => {
  	  const profesorDump = dump.profesorTitularWSDL.vacio
      const profesor = wsPPL.generarJsonProfesor({ raw: profesorDump })
      expect(profesor).to.be.an('object')
      expect(profesor).to.be.empty
      done()
  	})
  })

  // describe('@t5 LEER TODOS DE WS Y GENERAR JSON', () =>  {
  // 	it('@t5.1 OK ESTUDIANTES', (done) => {
  // 	  done()
  // 	})
  // 	it('@t5.1 OK PROFESORES', (done) => {
  // 	  done()
  // 	})
  // })

  describe('@t6 CONVERTIR XML A JSON LOS PARALELOS', () =>  {
    it('@t6.1 OK', (done) => {
      const estudiantesJson = dump.estudiantesJson()[0]
      let paralelos = wsPPL.generarJsonParalelosTodos({ estudiantesJson })
      expect(paralelos).to.have.lengthOf(8)
      expect(ajv.validate(schema.paralelosSinTerminoAnio, paralelos)).to.equal(true)
      done()
    })
    it('@t6.2 VACIO', (done) => {
      const estudiantesJson = []
      let paralelos = wsPPL.generarJsonParalelosTodos({ estudiantesJson })
      expect(paralelos).to.have.lengthOf(0)
      done()
    })
  })

  describe('@t7 DATABASE', () =>  {
  	describe('@t7.1 PARALELO', () =>  {
      let paralelosJson = wsPPL.anadirTerminoYAnio({ termino: '1', anio: '2017', json: dump.paralelos[0] })
  	  it('@t7.1.1 OK', (done) => {
        let cantidadLlamado = 0
        const db = {
          crearParalelo ({ codigoMateria, nombreMateria, paralelo, termino, anio }) {
            expect(codigoMateria).to.not.be.undefined
            expect(nombreMateria).to.not.be.undefined
            expect(termino).to.not.be.undefined
            expect(anio).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
  	  	wsPPL.guardarParalelos({ paralelosJson }).then((estado) => {
          expect(cantidadLlamado).to.equal(10)
          expect(logger.error.notCalled).to.be.true
  	      done()
  	  	}).catch((err) => console.log(err))
  	  })
      it('@t7.1.2 ERROR REJECT', (done) => {
        let errorMensaje = 'Mi error'
        const db = {
          crearParalelo(){
            return Promise.reject(errorMensaje)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.guardarParalelos({ paralelosJson }).catch((err) => {
          expect(err).to.equal(errorMensaje)
          expect(logger.error.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.1.3 ERROR GUARDADO UN PARALELO', (done) => {
        let errorMensaje = 'Mi error'
        let contador = 0
        const db = {
          crearParalelo () {
            contador++
            return contador === 5 ? Promise.resolve(false) : Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.guardarParalelos({ paralelosJson }).then((estado) => {
          expect(logger.error.calledOnce).to.be.true
  	      done()
  	  	}).catch((err) => console.log(err))
      })
  	})

  	describe('@t7.2 ESTUDIANTES', () =>  {
      let estudiantesJson = dump.estudiantesJson()[0]
      let cantidadEstudiantes = estudiantesJson.length
      it('@t7.2.1 OK', (done) => {
        let cantidadLlamado = 0
        const db = {
          crearEstudiante({ nombres, apellidos, correo, matricula, paralelo,  codigoMateria }) {
            expect(nombres).to.not.be.undefined
            expect(apellidos).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            expect(paralelo).to.not.be.undefined
            expect(codigoMateria).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.guardarEstudiantes({ estudiantesJson }).then((estado) => {
          expect(cantidadLlamado).to.equal(cantidadLlamado)
          expect(logger.error.notCalled).to.be.true
          done()
        }).catch((err) => console.log(err))
      })
      it('@t7.2.2 ERROR REJECT', (done) => {
        let errorMensaje = 'Mi error'
        const db = {
          crearEstudiante(){
            return Promise.reject(errorMensaje)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.guardarEstudiantes({ estudiantesJson }).catch((err) => {
          expect(err).to.equal(errorMensaje)
          expect(logger.error.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.2.3 ERROR GUARDADO UN ESTUDIANTE', (done) => {
        let errorMensaje = 'Mi error'
        let contador = 0
        const db = {
          crearEstudiante(){
            contador++
            return contador === 5 ? Promise.resolve(false) : Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.guardarEstudiantes({ estudiantesJson }).then((estado) => {
          expect(logger.error.calledOnce).to.be.true
          done()
        }).catch((err) => console.log(err))
      })
  	})
    describe('@t7.3 PROFESOR', () =>  {
      let profesoresJson = dump.profesoresJson()[0]
  	  it('@t7.3.1 OK', (done) => {
        let cantidadLlamado = 0
        const db = {
          crearProfesor({ nombres, apellidos, correo, tipo, paralelo, codigoMateria }) {
            expect(nombres).to.not.be.undefined
            expect(apellidos).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(tipo).to.not.be.undefined
            expect(paralelo).to.not.be.undefined
            expect(codigoMateria).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.guardarProfesores({ profesoresJson }).then((estado) => {
          expect(cantidadLlamado).to.equal(16)
          expect(logger.error.notCalled).to.be.true
          done()
        }).catch((err) => console.log(err))
      })
      it('@t7.3.2 ERROR REJECT', (done) => {
        let errorMensaje = 'Mi error'
        const db = {
          crearProfesor(){
            return Promise.reject(errorMensaje)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.guardarProfesores({ profesoresJson }).catch((err) => {
          expect(err).to.equal(errorMensaje)
          expect(logger.error.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.3.3 ERROR GUARDADO UN PROFESOR', (done) => {
        let errorMensaje = 'Mi error'
        let contador = 0
        const db = {
          crearProfesor(){
            contador++
            return contador === 5 ? Promise.resolve(false) : Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.guardarProfesores({ profesoresJson }).then((estado) => {
          expect(logger.error.calledOnce).to.be.true
          done()
        }).catch((err) => console.log(err))
      })
  	})
    describe('@t7.4 ACTUALIZAR', () =>  {
      it('@t7.4.1 ESTUDIANTE CAMBIO PARALELO', (done) => {
        let estudiantesJsonWS = dump.estudiantesJson()[0]
        let estudiantesJsonDB = JSON.parse(JSON.stringify(estudiantesJsonWS))
        estudiantesJsonWS[0]['paralelo'] = '2'
        estudiantesJsonWS[1]['paralelo'] = '3'
        let cantidadLlamado = 0
        const db = {
          cambiarEstudianteParalelo({ nuevo, correo, matricula }){
            expect(nuevo).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.actualizarEstudiantes({ estudiantesWS: estudiantesJsonWS, estudiantesDB: estudiantesJsonDB }).then((resp) => {
          expect(resp).to.be.true
          expect(cantidadLlamado).to.equal(2)
          expect(logger.info.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.4.2 ESTUDIANTE RETIRADO', (done) => {
        let estudiantesJsonWS = dump.estudiantesJson()[0]
        let estudiantesJsonDB = JSON.parse(JSON.stringify(estudiantesJsonWS))
        estudiantesJsonWS.splice(1,1)
        let cantidadLlamado = 0
        const db = {
          eliminarEstudiante({ paralelo, codigoMateria, correo, matricula }){
            expect(paralelo).to.not.be.undefined
            expect(codigoMateria).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.actualizarEstudiantes({ estudiantesWS: estudiantesJsonWS, estudiantesDB: estudiantesJsonDB }).then((resp) => {
          expect(resp).to.be.true
          expect(cantidadLlamado).to.equal(1)
          expect(logger.info.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.4.3 ESTUDIANTE NUEVO', (done) => {
        let estudiantesJsonWS = dump.estudiantesJson()[0]
        let estudiantesJsonDB = JSON.parse(JSON.stringify(estudiantesJsonWS))
        estudiantesJsonDB.splice(1,1)
        let cantidadLlamado = 0
        const db = {
          crearEstudiante({ nombres, apellidos, correo, matricula, paralelo,  codigoMateria }){
            expect(nombres).to.not.be.undefined
            expect(apellidos).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            expect(paralelo).to.not.be.undefined
            expect(codigoMateria).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.actualizarEstudiantes({ estudiantesWS: estudiantesJsonWS, estudiantesDB: estudiantesJsonDB }).then((resp) => {
          expect(resp).to.be.true
          expect(cantidadLlamado).to.equal(1)
          expect(logger.info.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.4.4 ESTUDIANTE CAMBIO CORREO', (done) => {
        let estudiantesJsonWS = dump.estudiantesJson()[0]
        let estudiantesJsonDB = JSON.parse(JSON.stringify(estudiantesJsonWS))
        estudiantesJsonWS[0]['correo'] = 'joelerll@gmail.com'
        let cantidadLlamado = 0
        const db = {
          cambiarCorreoEstudiante({ nuevo, correo, matricula }){
            expect(nuevo).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.actualizarEstudiantes({ estudiantesWS: estudiantesJsonWS, estudiantesDB: estudiantesJsonDB }).then((resp) => {
          expect(resp).to.be.true
          expect(cantidadLlamado).to.equal(1)
          expect(logger.info.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.4.5 ESTUDIANTE CAMBIO NOMBRES', (done) => {
        let estudiantesJsonWS = dump.estudiantesJson()[0]
        let estudiantesJsonDB = JSON.parse(JSON.stringify(estudiantesJsonWS))
        estudiantesJsonWS[0]['nombres'] = 'Joel Eduardo'
        let cantidadLlamado = 0
        const db = {
          cambiarNombresEstudiante({ nuevo, correo, matricula }){
            expect(nuevo).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.actualizarEstudiantes({ estudiantesWS: estudiantesJsonWS, estudiantesDB: estudiantesJsonDB }).then((resp) => {
          expect(resp).to.be.true
          expect(cantidadLlamado).to.equal(1)
          expect(logger.info.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.4.6 ESTUDIANTE CAMBIO APELLIDOS', (done) => {
        let estudiantesJsonWS = dump.estudiantesJson()[0]
        let estudiantesJsonDB = JSON.parse(JSON.stringify(estudiantesJsonWS))
        estudiantesJsonWS[0]['apellidos'] = 'Rodriguez LLamuca'
        let cantidadLlamado = 0
        const db = {
          cambiarApellidosEstudiante({ nuevo, correo, matricula }){
            expect(nuevo).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.actualizarEstudiantes({ estudiantesWS: estudiantesJsonWS, estudiantesDB: estudiantesJsonDB }).then((resp) => {
          expect(resp).to.be.true
          expect(cantidadLlamado).to.equal(1)
          expect(logger.info.calledOnce).to.be.true
          done()
        })
      })
      it('@t7.4.7 CAMBIO PARALELO, ACTUALIZAR CORREO, NUEVOS, ELIMINADOS', (done) => {
        let estudiantesJsonWS = JSON.parse(JSON.stringify(dump.estudiantesJson()[0]))
        let estudiantesJsonDB = JSON.parse(JSON.stringify(estudiantesJsonWS))
        estudiantesJsonWS[0]['apellidos'] = 'Rodriguez'
        estudiantesJsonWS[1]['correo'] = 'joelerll@gmail.com'
        let cantidadLlamado = 0
        let cantidadLlamadoCorreo = 0
        const db = {
          cambiarApellidosEstudiante({ nuevo, correo, matricula }){
            expect(nuevo).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            cantidadLlamado++
            return Promise.resolve(true)
          },
          cambiarCorreoEstudiante({ nuevo, correo, matricula }){
            expect(nuevo).to.not.be.undefined
            expect(correo).to.not.be.undefined
            expect(matricula).to.not.be.undefined
            cantidadLlamadoCorreo++
            return Promise.resolve(true)
          }
        }
        const wsPPL = WSPPL({ config, db, logger })
        wsPPL.actualizarEstudiantes({ estudiantesWS: estudiantesJsonWS, estudiantesDB: estudiantesJsonDB }).then((resp) => {
          expect(resp).to.be.true
          expect(cantidadLlamado).to.equal(1)
          expect(cantidadLlamadoCorreo).to.equal(1)
          expect(logger.info.calledTwice).to.be.true
          done()
        })
      })
    })

    describe('@t7.5 INTEGRACION', () =>  {
    	db = require('./mongo/db')
    	const WSPPL = require('./index.js')
			before(async () => {
				await db.Conectar(`mongodb://localhost/webServiceTest`)
		    // await db.Limpiar() // desactivar
		  })
		  after(() => {
				db.Desconectar()
		  })
			describe('@t7.5.1 INICIALIZAR', () =>  {
				before(async () => {
					dbMongo = require('./dbMock')
					ws = WSPPL({ db: dbMongo, anio: '2017', termino: '1s', local: true, cron: '00 * * * * *', dump })
					// await ws.inicializar() // desactivar
		  	})
				it('@t7.5.1.1 paralelos creados', (done) => {
					dbMongo.obtenerTodosParalelos().then((paralelos) => {
						expect(paralelos.length).to.equal(10)
						expect(ajv.validate(schema.paralelosDB, paralelos)).to.equal(true)
						done()
					})
				})
				it('@t7.5.1.2 estudiantes creados', (done) => {
					dbMongo.obtenerTodosEstudiantes().then((estudiantes) => {
						expect(estudiantes.length).to.equal(886)
      			expect(ajv.validate(schema.estudiantesDB, estudiantes)).to.equal(true)
						done()
					})
				})
				it('@t7.5.1.3 profesores creados', (done) => {
					dbMongo.obtenerTodosProfesores().then((profesores) => {
						expect(profesores.length).to.equal(10)
      			expect(ajv.validate(schema.profesoresDB, profesores)).to.equal(true)
						done()
					})
				})
				it('@t7.5.1.4 estudiantes anadidos a paralelo', async () => {
					let estudiantes = await dbMongo.obtenerTodosEstudiantes()
					let paralelos = await dbMongo.obtenerTodosParalelos()
					for (paralelo of paralelos) {
						for (matricula of paralelo.estudiantes) {
							let existe = estudiantes.find((est) => {
								return est.matricula == matricula  // < == cambiar por correo si es necesario
							})
							expect(existe).to.be.an('object')
						}
					}
				})
				it('@t7.5.1.5 profesores anadidos a paralelo', (done) => {
					done()
				})
				it('@t7.5.1.6 un paralelo por estudiante', (done) => {
					done()
				})
			})
			describe('@t7.5.2 ACTUALIZAR', () =>  {
				it('@t7.5.2.1 estudiante retirado', (done) => {

				})
				// it('@t7.5.2.1 estudiante anadido', (done) => {

				// })
				// it('@t7.5.2.1 estudiante cambiado paralelo', (done) => {

				// })
				// it('@t7.5.2.1 estudiante cambiado correo', (done) => {

				// })
				// it('@t7.5.2.1 estudiante cambiado nombres', (done) => {

				// })
				// it('@t7.5.2.1 estudiante cambiado apellidos', (done) => {

				// })
			})
    })
  })

})

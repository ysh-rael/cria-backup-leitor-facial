'use strict';

var config = require('./config'),
	crypto = require('crypto'),
	fs = require('fs')

const request = require('request');
const path = require('path')

const exec = require('child_process').exec;


function mensagemErroHumanizada(str, elemento) {
	if (!elemento) elemento = 'Servidor'
	if (/ETIMEDOUT/img.test(str)) return `${elemento} está offline`;
	if (/ECONNREFUSED/img.test(str)) return `A conexão foi recusada`;
	if (/ENOTFOUND/img.test(str)) return `${elemento} não encontrado. Verifique o endereço.`;
	if (/EHOSTUNREACH/img.test(str)) return `${elemento} inatingível. Verifique sua conexão.`;
	if (/ECONNRESET/img.test(str)) return `Conexão reiniciada pelo ${elemento}. Tente novamente.`;
	if (/EADDRINUSE/img.test(str)) return `Endereço já em uso. Tente outro endereço.`;

	// Caso o erro seja desconhecido, retorna o próprio erro
	console.log('mensagemErroHumanizada - str:')
	console.log(str)

	return str || 'Erro Desconhecido. Tente novamente.';
}

/**
 * Verifica junto ao equipamento se as credenciais são válidar. Isso é último para validar senha, se o equipamento está ativo ou para saber se o formato de requisição feita pelo braparking será aceito.
 * @returns 
 */
function testarConexaoHik() {

	return new Promise((resolve, reject) => {

		try {

			const modelo = this.modelo;
			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			const url = `${protocolo}://${ip}:${port}${this.routerUserCheck}`;

			const options = {
				url: url,
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false // Para ignorar erros de certificado auto-assinado
			};

			request(options, (error, response, body) => {
				if (error) {
					console.log('Erro na Requisição[REQ00]')
					reject({ error: 1, message: mensagemErroHumanizada(error.message, 'Leitor facial') })
					return;
				}

				if (response.statusCode === 200) return resolve({ error: false, message: 'Credenciais válidas.' })

				console.log('body')
				console.log(body)

				delete options.auth

				console.log('usuario != "undefined": ' + usuario)
				console.log('senha != "undefined": ' + senha != undefined)

				reject({ error: 1, message: humanizaMensagemHTTP(response.statusCode) })
			});

		} catch (error) {
			console.log('Ocorreu um erro interno [CTCH00]')
			console.log(error)
			return reject({ error: 1, message: error.message })
		}
	})

}

/**
 * Retorna uma mensagem humanizada baseada no código de status HTTP ou mensagem.
 * @param {number|string} codigo - O código de status HTTP.
 * @param {string} mensage - A mensagem de erro.
 * @returns {string} A mensagem humanizada correspondente.
 */
function humanizaMensagemHTTP(codigo, mensage) {

	console.log(`humanizaMensagemHTTP\ncodigo: ${codigo}\nmensage: ${mensage}`)

	if (/^401$/.test(codigo) || /^Unauthorized$/.test(mensage)) {
		return 'Não autorizado.';
	} else if (/^404$/.test(codigo) || /^Not Found$/.test(mensage)) {
		return 'Recurso não encontrado.';
	} else if (/^500$/.test(codigo) || /^Internal Server Error$/.test(mensage)) {
		return 'Erro interno do servidor.';
	} else if (/^403$/.test(codigo) || /^Forbidden$/.test(mensage)) {
		return 'Acesso proibido.';
	} else if (/^400$/.test(codigo) || /^Bad Request$/.test(mensage)) {
		return 'Requisição inválida.';
	} else if (/^408$/.test(codigo) || /^Request Timeout$/.test(mensage)) {
		return 'Tempo de requisição esgotado.';
	}

	// Mensagem padrão se não houver correspondência específica
	return 'Ocorreu um erro desconhecido: ';
}


/**
 * 
 * @param {object} obj 
 * @param {number} obj.PaginateInitial Index que deve começar a paginação de busca
 * @param {number} obj.maxResults Máximo de resultados obtidos da busca no equipamento
 * @param {{EmployeeNo: string}[]} obj.employeeNo array de busca por id único
 * @param {string} obj.name buscar por id único
 */
function findUsers(obj) {

	return new Promise((resolve, reject) => {

		try {
			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			const url = `${protocolo}://${ip}:${port}${this.routerUserInfo}`;

			const body = {
				UserInfoSearchCond: {
					searchID: Date.now().toString(),
					searchResultPosition: obj.PaginateInitial || 0,
					maxResults: obj.maxResults || 20,
					EmployeeNoList: obj.employeeNo || [],
					NameList: obj.name
				}
			}

			if (obj) {
				if (obj.name && !obj.employeeNo) delete body.UserInfoSearchCond.EmployeeNoList
				else if (obj.employeeNo && !obj.name) delete body.UserInfoSearchCond.NameList
				else if (!obj.name && !obj.employeeNo) {
					body.UserInfoSearchCond.EmployeeNoList = []
					delete body.UserInfoSearchCond.NameList
				}

			} else delete body.UserInfoSearchCond.NameList

			const options = {
				url: url,
				method: 'POST',
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false, // Para ignorar erros de certificado auto-assinado
				body: body,
				json: true // Isso garante que o body seja enviado como JSON
			};

			request(options, (error, response, body) => {
				if (error) {
					console.log('Erro na Requisição[REQ01]')
					reject({ error: 1, message: mensagemErroHumanizada(error.message, 'Leitor facial') })
					return
				}

				if (response.statusCode === 200) return resolve(body)
				console.log('body')
				console.log(body)
				reject({ error: 1, message: humanizaMensagemHTTP(response.statusCode) })

			});
		} catch (error) {
			console.log('Ocorreu um erro interno [CTCH01]')
			return reject({ error: 1, message: error.message })
		}

	})
}

/**
 * Detela um ou mais usuários do equipamento.
 * @param {object} obj 
 * @param {array<{string}>} obj.arrayUsers array de employeeNo que serão deletados do equipamento
 */
function deleteUsers(obj) {

	return new Promise((resolve, reject) => {

		try {
			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			const url = `${protocolo}://${ip}:${port}${this.routerUserDelete}`;

			if (!obj || !Array.isArray(obj.arrayUsers)) {
				reject(new Error(`Não foi possível obter o ID Único do usuário a ser deletado.`))
				return;
			}

			const body = {
				UserInfoDelCond: {
					EmployeeNoList: obj.arrayUsers.map(employeeNo => ({ employeeNo: employeeNo }))
				}
			}

			const options = {
				url: url,
				method: 'PUT',
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false, // Para ignorar erros de certificado auto-assinado
				body: body,
				json: true // Isso garante que o body seja enviado como JSON
			};

			request(options, (error, response, body) => {
				if (error) {
					console.log('Erro na Requisição[REQ02]')
					reject({ error: 1, message: mensagemErroHumanizada(error.message, 'Leitor facial') })
					return;
				}

				if (response.statusCode === 200) return resolve(body)
				reject(new Error(humanizaMensagemHTTP(response.statusCode)))
			});
		} catch (error) {
			console.log('Ocorreu um erro interno [CTCH02]')
			reject({ error: 1, message: error.message })
			return;
		}
	})
}


/**
 * 
 * @param {object} obj 
 * @param {string} obj.employeeNo id único
 * @param {string} obj.nome nome do usuário
 * @param {'normal'|'visitant'|'blockList'} obj.tipo tipo de nível de acesso do usuário (visitante, normal ou blockList)
 * @param {('Male'|'Female')?} obj.genero Genero do usuário
 * @param {string} obj.andar n° andar do prédio que o usuário vai ter acesso
 * @param {string} obj.sala n° da sala do prédio que o usuário vai ter acesso
 * @param {string} obj.dataInicio O cadstro do usuário valerá a partir dessa data
 * @param {string} obj.dataFim O cadstro do usuário valerá até dessa data
 * @param {boolean} obj.localUIRight Se o usuário possui o controle de acesso de administrador
 * @param {'authType'|'custom'} obj.authType Se Qual o padrão de autenticação deve ser usado. (caartão, face e cartão etc...). Caso seja utilizado o 'custom', o padrão deve ser passado para o atr 'userVerifyMode'
 * @param {string} obj.userVerifyMode Qual o padrão customizado de autenticação deve ser usado nesse usuário
 * @param {number} obj.maxOpenDoorTime 0-255:  A tradução literal da hik é "Horarios de visita" mas não sei informar se são minutos, segundos ou a regra de negócio dessa funcionalidade
 */
function updateUsers(obj) {

	return new Promise((resolve, reject) => {

		try {
			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			const url = `${protocolo}://${ip}:${port}${this.routerUserUpdate}`;

			// Validações de param
			if (!obj.dataInicio) throw new Error('Data de início é inválido.')
			if (!obj.dataFim) throw new Error('Data fim é inválido.')

			const body = {
				UserInfo: {
					employeeNo: obj.employeeNo,
					name: obj.nome,
					userType: obj.tipo || 'normal',
					localUIRight: !!obj.localUIRight,
					gender: obj.genero,
					Valid: {
						enable: true,
						beginTime: obj.dataInicio.length < 19 ? obj.dataInicio + ':00' : obj.dataInicio,
						endTime: obj.dataFim.length < 19 ? obj.dataFim + ':59' : obj.dataFim
					},
					userVerifyMode: obj.authType === 'custom' ? obj.userVerifyMode : '',
					maxOpenDoorTime: parseInt(obj.maxOpenDoorTime) || 0,
					doorRight: '1',
					floorNumber: parseInt(obj.andar) || 0,
					roomNumber: parseInt(obj.sala) || 0,
					RightPlan: [
						{
							doorNo: 1,
							planTemplateNo: '1'
						}
					]
				}
			}




			const options = {
				url: url,
				method: 'PUT',
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false, // Para ignorar erros de certificado auto-assinado
				body: body,
				json: true // Isso garante que o body seja enviado como JSON
			};

			request(options, (error, response, body) => {
				if (error) {
					console.log('Erro na Requisição[REQ03]')
					reject(new Error(mensagemErroHumanizada(error.message, 'Leitor facial')))
					return;
				}

				if (response.statusCode === 200) return resolve(body)
				console.log('body')
				console.log(body)
				let msgErro = `Erro desconhecido: Leitor facial relatou um erro desconhecido`
				if (typeof body === 'string') { // Tratamento de mensagem genérico
					if (/not found/img.test(body)) {
						console.log('[TMG01 - 404]')
						msgErro = 'Não foi encontrado ou offline';
					} else if (/internal server error/img.test(body)) {
						console.log('[TMG02 - 500]')
						msgErro = 'Ocorreu um problema interno no leitor Facial.';
					} else if (/bad request/img.test(body)) {
						console.log('[TMG03 - 400]')
						msgErro = 'Requisição inválida: A requisição não pôde ser entendida pelo servidor.';
					} else if (/unauthorized/img.test(body)) {
						console.log('[TMG04 - 401]')
						msgErro = 'Não autorizado: Acesso não autorizado.';
					} else if (/forbidden/img.test(body)) {
						console.log('[TMG05 - 403]')
						msgErro = 'Proibido: Você não tem permissão para acessar este recurso.';
					} else if (/service unavailable/img.test(body)) {
						console.log('[TMG06 - 503]')
						msgErro = 'Serviço indisponível: O leitor facial está temporariamente indisponível.';
					} else {
						console.log('[TMG00 - ???]')
						msgErro = 'Erro desconhecido: Leitor facial relatou um erro desconhecido.';
					}
				}

				return reject(new Error(msgErro))
			});
		} catch (error) {
			return reject({ error: 1, message: `Ocorreu um erro interno [CTCH03]: ${error.message}` })
		}

	})
}

/**
 * Função updateImage que recebe a imagem e outros dados
 * 
 * *	Salva a imagem na pasta publica.
 * *	Solicita a HikAPI a atualização da imagem
 * *	Exclui imagem 
 * @param {object} obj 
 * @param {string} obj.employeeNo id único
 * @param {"blackFD"} obj.faceType tipo de face
 * @param {number} obj.FDID id da biblioteca de faces
 * @param {Buffer} obj.imageBuffer buffer da imagem
 * @param {string} obj.filename filename da imagem
 * @param {string} obj.contentType contentType da imagem
 */
function updateImage(obj) {
	console.log('updateImage');

	return new Promise((resolve, reject) => {
		try {
			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			if (!obj.imageBuffer || !obj.contentType) return resolve()

			const imagePath = salvarImagem({
				filename: obj.filename || Date.now() + parseInt(Math.random() * 100),
				buffer: obj.imageBuffer,
				contentType: obj.contentType,
			})


			const hikAPI = new HikAPI()
			hikAPI.face.set([
				{
					device: {
						strUsername: usuario,
						strPassword: senha,
						strDeviceIP: ip,
						strHttpPort: port,
					},
					actions: [
						{
							class: 'FaceManagement',
							method: 'Set',
							employeeno: obj.employeeNo,
							faceType: 'blackFD',
							FDID: '1',
							image: { path: imagePath },
						}
					]
				}
			])
				.then(() => {
					console.log('Imagem atualizada com sucesso. Iniciando remoção da imagem local')
					fs.unlink(imagePath, console.log)
					resolve()
				})
				.catch(error => {
					fs.rm(imagePath, console.log)
					console.log('error -- catch -.-1-')
					console.log(error)

					console.log('Ocorreu um erro interno [CTCH01]')
					return reject({ error: 1, message: error.message });
				})


		} catch (error) {
			console.log('Ocorreu um erro interno [CTCH04]')
			return reject({ error: 1, message: error.message });
		}
	});
}

/**
 * Atualiza cartões.
 * @param {{
 * 	employeeNo: string,
 * 	cardNo: string,
 *  cardType: string
 * }[]} array 
 */
function updateCard(array) {

	return new Promise((resolve, reject) => {

		try {

			if (!Array.isArray(array)) {
				console.log('[AT001]')
				return reject(new Error('Inconsistência de dados: Não foi possível registrar os cartões.'))
			}

			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			const url = `${protocolo}://${ip}:${port}${this.routerCardUpdate}`;

			const options = {
				url: url,
				method: 'PUT',
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false, // Para ignorar erros de certificado auto-assinado
				body: {}, // Será sobrescrito 
				json: true // Isso garante que o body seja enviado como JSON
			};

			Promise.all(array.map(objBody => {
				options.body = JSON.stringify({ cardInfo: objBody })

				return new Promise((resolveCard, rejecrCard) => {
					request(options, (error, response, body) => {
						if (error) {
							console.log('Erro na Requisição[REQ04]')
							reject({ error: 1, message: mensagemErroHumanizada(error.message, 'Leitor facial') })
							return;
						}

						if (response.statusCode === 200) return resolveCard(body)

						console.log('body: ')
						console.log(body)

						let msgErro = `Leitor facial retornou um erro desconhecido. Tente novamente.`
						if (typeof body === 'string') { // Tratamento de mensagem genérico
							if (/not found/img.test(body)) {
								console.log('[TMG01 - 404]')
								msgErro = 'Não foi encontrado: A URL requisitada não foi encontrada no leitor facial.';
							} else if (/internal server error/img.test(body)) {
								console.log('[TMG02 - 500]')
								msgErro = 'Erro interno do leitor facial.';
							} else if (/bad request/img.test(body)) {
								console.log('[TMG03 - 400]')
								msgErro = 'Requisição inválida: A requisição não pôde ser entendida pelo leitor facial.';
							} else if (/unauthorized/img.test(body)) {
								console.log('[TMG04 - 401]')
								msgErro = 'Não autorizado: Acesso não autorizado.';
							} else if (/forbidden/img.test(body)) {
								console.log('[TMG05 - 403]')
								msgErro = 'Proibido: Você não tem permissão para acessar este recurso.';
							} else if (/service unavailable/img.test(body)) {
								console.log('[TMG06 - 503]')
								msgErro = 'Serviço indisponível: O leitor facial está temporariamente indisponível.';
							} else {
								console.log('[TMG00 - ???]')
								msgErro = 'Leitor facial relatou um erro desconhecido.';
							}
						} else if (typeof body === 'object') {
							if (/checkEmployeeNo/img.test(body.errorMsg)) {
								console.log('[TMG07 - 400]')
								msgErro = 'Em uso em outro registro.';

							} else if (/Invalid Content/img.test(body.statusString)) {
								console.log('[TMG08 - 400]')
								msgErro = 'Conteúdo inválido. Verifique e tente novamente.';
							}
						}

						console.log(`Erro ao registrar ID Cliente: ${msgErro}`)
						rejecrCard(new Error(`Erro em ID Cliente: ${msgErro}`))
					});
				})
			}))
				.then(res => {
					resolve(res)
				})
				.catch(error => reject(error))

		} catch (error) {
			console.log('Ocorreu um erro interno [CTCH05]')
			return reject({ error: 1, message: error.message })
		}
	})
}

/**
 * 
 * @param {object} obj 
 * @param {'blackFD'} obj.faceLibType Index que deve começar a paginação de busca
 * @param {string} obj.FDID da face. Por padrão, coloque "1"
 * @param {string} obj.FPID employeeno do usuário
 */
function findFace(obj) {

	return new Promise((resolve, reject) => {

		try {

			if (typeof obj !== 'object') return reject(new Error('Inconsistência de tipagem de objeto'))
			if (!obj.FPID) return reject(new Error('ID Único é obrigatório e não foi informado'))

			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			const url = `${protocolo}://${ip}:${port}${this.routerUserGetImage}`;

			const body = {
				searchResultPosition: 0,
				maxResults: obj.maxResults || 1,
				faceLibType: obj.faceLibType || 'blackFD',
				FDID: obj.FDID || '1',
				FPID: obj.FPID
			}

			const options = {
				url: url,
				method: 'POST',
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false, // Para ignorar erros de certificado auto-assinado
				body: body,
				json: true // Isso garante que o body seja enviado como JSON
			};

			request(options, (error, response, body) => {
				if (error) {
					console.log('Erro na Requisição[REQ05]')
					return reject({ error: 1, message: mensagemErroHumanizada(error.message, 'Leitor facial') })
				}

				if (response.statusCode === 200) return resolve(body)
				reject(new Error(humanizaMensagemHTTP(response.statusCode)))
			});
		} catch (error) {
			console.log('Ocorreu um erro interno [CTCH06]')
			return reject({ error: 1, message: error.message })
		}

	})
}

/**
 * Realiza uma requisição get genérica. Comumente usada para obter a imagem do usuário
 * @param {string} url URL para requisição
 */
function getRequest(url) {

	return new Promise((resolve, reject) => {

		try {

			if (typeof url !== 'string') return reject(new Error('Erro interno: Inconsistência de tipagem em URL'))

			const usuario = this.usuario;
			const senha = this.senha;

			const options = {
				url: url,
				method: 'GET',
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false, // Para ignorar erros de certificado auto-assinado
				encoding: null // Para receber a resposta como um buffer binário
			};

			request(options, (error, response, body) => {
				if (error) {
					console.log('Erro na Requisição[REQ06]')
					return reject({ error: 1, message: mensagemErroHumanizada(error.message, 'Leitor facial') })
				}

				if (response.statusCode === 200) return resolve(response.body)
				console.log('getRequest - body de resposta: ')
				console.log(body)
				reject(new Error(humanizaMensagemHTTP(response.statusCode)))
			});
		} catch (error) {
			return reject({ error: 1, message: `Ocorreu um erro interno [CTCH07]: ${error.message}` })
		}

	})
}

/**
 * Obtém cartões. 
 * 
 * A busca pode ser feita por todos os cartões, por número especifico ou por cartões pertecentes a um employeeno (usuário)
 * @param {object} obj 
 * @param {number} obj.searchResultPosition Index que deve começar a paginação de busca
 * @param {number} obj.maxResults da face. Por padrão, coloque "1"
 * @param {{ "cardNo": string }[]} obj.CardNoList filtrar pelo número do cartão
 * @param {{ "employeeNo": string }[]} obj.EmployeeNoList filtrar por employeeno do usuário
 */
function findCard(obj) {

	return new Promise((resolve, reject) => {

		try {

			if (typeof obj !== 'object') {
				console.log('[TOBJ03]')
				reject(new Error('Erro interno: Inconsistência de tipagem de objeto'))
				return;
			}

			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			const url = `${protocolo}://${ip}:${port}${this.routerCardSearch}`;

			const body = {
				CardInfoSearchCond: {
					searchID: Date.now().toString(),
					searchResultPosition: parseInt(obj.searchResultPosition) || 0,
					CardNoList: obj.CardNoList || [],
					EmployeeNoList: obj.EmployeeNoList || [],
				}
			}

			if (obj.maxResults) body.CardInfoSearchCond.maxResults = parseInt(obj.maxResults)

			const options = {
				url: url,
				method: 'POST',
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false, // Para ignorar erros de certificado auto-assinado
				body: body,
				json: true // Isso garante que o body seja enviado como JSON
			};

			request(options, (error, response, body) => {
				if (error) {
					console.log('Erro na Requisição[REQ07]')
					reject({ error: 1, message: mensagemErroHumanizada(error.message, 'Leitor facial') })
					return;
				}

				if (response.statusCode === 200) return resolve(body)
				console.log('options')
				console.log(options.body.CardInfoSearchCond)
				console.log('body:')
				console.log(body)
				reject(new Error(humanizaMensagemHTTP(response.statusCode)))
			});
		} catch (error) {
			console.log('Ocorreu um erro interno [CTCH08]')
			return reject({ error: 1, message: error.message })
		}

	})
}

/**
 * Excluir cartões. 
 * 
 * @param {object} obj 
 * @param {{ "cardNo": string }[]} obj.CardNoList filtrar pelo número do cartão
 * @param {{ "employeeNo": string }[]} obj.EmployeeNoList filtrar por employeeno do usuário
 */
function deleteCard(obj) {

	return new Promise((resolve, reject) => {

		try {

			if (typeof obj !== 'object') {
				console.log('[TOBJ03]')
				reject(new Error('Inconsistência de tipagem de objeto'))
				return;
			}

			const usuario = this.usuario;
			const senha = this.senha;
			const ip = this.ip;
			const port = this.port;
			const protocolo = this.protocolo

			const url = `${protocolo}://${ip}:${port}${this.routerCardDelete}`;

			const body = {
				CardInfoDelCond: {
					CardNoList: obj.CardNoList || [],
					EmployeeNoList: obj.EmployeeNoList || [],
				}
			}

			const options = {
				url: url,
				method: 'PUT',
				auth: {
					user: usuario,
					pass: senha,
					sendImmediately: false // Isso força o uso de autenticação Digest
				},
				timeout: 6000,  // Timeout em milissegundos (6 segundos)
				strictSSL: false, // Para ignorar erros de certificado auto-assinado
				body: body,
				json: true // Isso garante que o body seja enviado como JSON
			};

			request(options, (error, response, body) => {
				if (error) {
					console.log('Erro na Requisição[REQ07]')
					reject({ error: 1, message: mensagemErroHumanizada(error.message, 'Leitor facial') })
					return;
				}

				if (response.statusCode === 200) return resolve(body)
				console.log('body:')
				console.log(body)
				reject(new Error(humanizaMensagemHTTP(response.statusCode)))
			});
		} catch (error) {
			console.log('Ocorreu um erro interno [CTCH08]')
			return reject({ error: 1, message: error.message })
		}

	})
}


/**
 * 
 * @param {object} obj 
 * @param {'Hik-DSK1T'} obj.modelo
 * @param {string} obj.usuario
 * @param {string} obj.senha
 * @param {string} obj.ip // ip com máscara. A classe irá remover a máscara antes de armazenar.
 * @param {string} obj.port
 * @param {'http'|'https'} obj.protocolo protocolo utilizado HTTP/HTTPS
 */
const HikDSK11 = function (obj) {
	this.modelo = obj.modelo;
	this.usuario = obj.usuario;
	this.senha = obj.senha;
	this.ip = obj.ip;
	this.port = obj.port;
	this.protocolo = obj.protocolo || 'http'

	this.routerUserCheck = '/ISAPI/Security/userCheck'
	this.routerUserInfo = '/ISAPI/AccessControl/UserInfo/Search?format=json'
	this.routerUserDelete = '/ISAPI/AccessControl/UserInfo/Delete?format=json'
	this.routerUserUpdate = '/ISAPI/AccessControl/UserInfo/SetUp?format=json'
	this.routerUserGetImage = '/ISAPI/Intelligent/FDLib/FDSearch?format=json'
	this.routerImageUpdate = '/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json'
	this.routerCardUpdate = '/ISAPI/AccessControl/CardInfo/SetUp?format=json'
	this.routerCardSearch = '/ISAPI/AccessControl/CardInfo/Search?format=json'
	this.routerCardDelete = '/ISAPI/AccessControl/CardInfo/Delete?format=json'


	this.modelUpdate = {
		UserInfo: {
			employeeNo: '',
			name: '',
			userType: '',
			Valid: {
				enable: true,
				beginTime: '2024-12-31T23:59:59',
				endTime: '2024-12-31T23:59:59'
			},
			doorRight: '1',
			RightPlan: [
				{
					doorNo: 1,
					planTemplateNo: ''
				}
			]
		}
	}

	this.modelGetImage = {
		searchResultPosition: 0,
		maxResults: 5,
		faceLibType: 'FaceType',
		FDID: 'FDID',
		FPID: 'EmployeeNo'
	};



}


HikDSK11.prototype = {
	testarConexao: testarConexaoHik,
	findUsers: findUsers,
	deleteUsers: deleteUsers,
	updateUsers: updateUsers,
	updateImage: updateImage,
	updateCard: updateCard,
	findFace: findFace,
	getRequest: getRequest,
	findCard: findCard,
	deleteCard: deleteCard,
	hikAPI: new HikAPI()
}


function HikAPI() {
}

HikAPI.prototype = {
	face: {
		set: handlerSetFace
	}
}

/**
*  HikAPI: Altera imagem usuário.
* @param { {
*	device: {
*		strUsername: String,
*		strPassword: String,
*		strDeviceIP: String,
*		strHttpPort: String
*	},
*	actions: [{
*		class: 'Dispositivo'|'ControlDoor'|'CardManagement'|'FaceManagement'|'UserManagement'|'CardManagement',
*		method: 'Get'|'Set'|'Delete'|'Open'|'Close'|'StayOpen'|'StayClose'|'Login',
*		employeeno: String,
*		faceType: 'blackFD',
*		FDID: String|Number,
*		image: { path: String }
*	}]
*}[]} options
*/
function handlerSetFace(options) {
	console.log(options);

	const comandoCMD = 'HikAPI.exe ' + JSON.stringify(options).replace(/"/g, '\\"');
	const caminho = path.join(__dirname, '..', 'HikAPI', 'bin', 'Debug');

	return new Promise((resolve, reject) => {
		execChildProcess(comandoCMD, caminho)
			.then((res) => {
				const killProcess = typeof res.killProcess === 'function' ? res.killProcess : () => console.log('Não foi possível encontrar a função para matar o processo.')
				// const stdout = res.stdout
				const stderr = res.stderr

				killProcess()

				if (stderr) {
					console.log()
					console.error('Erro no processo filho:', stderr.message);
					return reject(stderr.message)
				}

				resolve();
			})
			.catch(error => {
				console.error('Erro ao executar o processo filho:', error);
				reject(error);
			});
	});
}

/**
 * Salva imagem na pasta de imagens na pasta publica e retorna o caminho dela.
 * 
 * * Envie a imagem como buffer: <Buffer 89 50 4e ... >
 * * Insira o nome da imagem sem a extensão: nomeImage
 * * contentType é o tipo de imagem.
 * 
 * ----
 * 
 * **Essa função não trata erros:** A solução que a chamar deve se encarregar de trata-los.
 * @param {{
 *		filename: string,
 *		buffer: buffer,
 *		contentType: 'image/jpg'|'image/png'|'image/jpeg'
 *	}} options 
 * @returns Caminho da imagem criada
*/
function salvarImagem(options) {
	let imagePath = ''

	switch (options.contentType) {
		case 'image/jpg': imagePath = path.join(publicPath, 'images', 'faceUser', options.filename + '.jpg'); break;
		case 'image/png': imagePath = path.join(publicPath, 'images', 'faceUser', options.filename + '.png'); break;
		case 'image/jpeg': imagePath = path.join(publicPath, 'images', 'faceUser', options.filename + '.jpeg'); break;
		default:
			console.log('Content-Type da imagem é inválido. contentType: ' + options.contentType)
			throw new Error('Content-Type da imagem é inválido.')
	}

	fs.writeFileSync(imagePath, options.buffer)

	return imagePath
}

/**
 * Cria um processo filho e retorna uma função para encerra-lo.
 * 
 * @param {string} comando comando que será executado no CMD
 * @param {Stirng} caminho Caminho onde o comando CMD deverá ser executado
 * @return {Promise<function>}  Função que mata o processo
 */
function execChildProcess(comando, caminho) {
	let childProcess;

	return new Promise((resolve, reject) => {
		try {
			childProcess = exec(comando, { cwd: caminho }, (error, stdout, stderr) => {
				if (error) {
					console.error(stdout + '\n' + error);
					console.log('stderr')
					console.log(stderr)
					return reject(new Error(error.message || 'Erro desconhecido.'));
				}

				// Retorna o PID do processo
				const processId = childProcess.pid;

				// Função para matar o processo
				function killProcess() {
					treeKill(processId, 'SIGTERM', (error) => {
						if (error) {
							console.error(`Erro ao finalizar o processo ${processId}: ${error}`);
							return;
						}

						console.log(`Processo ${processId} finalizado com sucesso.`);
					});
				}

				// Retorna uma função que pode ser chamada para matar o processo, e as saídas stdout e stderr
				return resolve({ killProcess, stdout, stderr });
			});
		} catch (error) {
			console.error('Erro na execução do processo filho:');
			console.log(error);
			return reject(error);
		}
	});
}

function findByIndex(array, index, options) {
	if (!Array.isArray(array)) throw new Error('findByIndex: Primeiro argumento deve ser um array');
	if (typeof index !== 'number') throw new Error('findByIndex: Segundo argumento deve ser um número')

	const element = array[index];
	return options.fn(element);
}

/**
 * Remove duplicatas de um array, retornando um array com apenas valores únicos.
 *
 * @param {Array} arr - O array que pode conter valores duplicados.
 * @returns {Array} Um array com apenas valores únicos.
 *
 * @example
 * // Retorna [1, 2, 3, 4]
 * removeDuplicates([1, 2, 3, 3, 4]);
 *
 * @example
 * // Retorna ['a', 'b', 'c']
 * removeDuplicates(['a', 'b', 'a', 'c']);
 */
function removeDuplicates(arr) {
	var uniqueArray = [];
	for (var i = 0; i < arr.length; i++) {
		if (uniqueArray.indexOf(arr[i]) === -1) {
			uniqueArray.push(...arr[i]);
		}
	}
	return uniqueArray;
}


/**
 * Criptografa um texto usando o algoritmo AES-256-CBC com uma chave secreta fornecida ou padrão.
 * Se a chave não for fornecida, a chave padrão de `config.crypto.secret` será usada.
 * O IV (Vetor de Inicialização) é gerado aleatoriamente e adicionado ao conteúdo criptografado.
 *
 * @param {string} text - O texto em formato plano que será criptografado.
 * @param {string} [key=config.crypto.secret] - A chave secreta para criptografia. Se não fornecida, usa a chave padrão.
 * @returns {string} O texto criptografado em formato hexadecimal, com o IV adicionado no início.
 */
function encrypt(text, key) {
	// Chave secreta e IV (Initialization Vector)
	if (!key) key = config.crypto.secret

	if (key.length < 32) while (key.length < 32) key += '0'
	else if (key.length > 32) key = key.slice(0, 32);

	// Gerando um IV aleatório
	const iv = crypto.randomBytes(16);
	const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
	let encrypted = cipher.update(text, 'utf-8', 'hex');
	encrypted += cipher.final('hex');

	// Retorna o IV junto com o conteúdo criptografado
	return iv.toString('hex') + ':' + encrypted;
}

/**
 * Descriptografa um texto criptografado usando o algoritmo AES-256-CBC.
 * Utiliza o IV (Vetor de Inicialização) contido no início do texto criptografado.
 *
 * @param {string} encryptedText - O texto criptografado que será descriptografado.
 * @returns {string} O texto original em formato plano.
 */
function decrypt(encryptedText, key) {

	// Chave secreta e IV (Initialization Vector)
	if (!key) key = config.crypto.secret

	if (key.length < 32) while (key.length < 32) key += '0'
	else if (key.length > 32) key = key.slice(0, 32);

	const textParts = encryptedText.split(':');
	const iv = Buffer.from(textParts.shift(), 'hex');
	const encrypted = textParts.join(':');
	const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
	let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
	decrypted += decipher.final('utf-8');
	return decrypted;
}

function identifyImageType(buffer) {
	// Verifica os primeiros 4 bytes do buffer
	const byteArray = new Uint8Array(buffer);
	const header = byteArray.subarray(0, 4).reduce((acc, byte) => acc + byte.toString(16), '').toUpperCase();

	console.log(`header: ${header}`)

	// Checa as assinaturas de diferentes tipos de imagem
	if (header.startsWith('FFD8FF')) return 'image/jpeg'; // JPEG (pode incluir FFD8FFE0, FFD8FFE1, etc.)

	if (header.startsWith('89504E47')) return 'image/png'; // PNG

	if (header.startsWith('47494638')) return 'image/gif'; // GIF

	// Tipo desconhecido. envia o tipo jpg pois é o com maior compatibilidade
	return 'image/jpg'

}

function calcularPorcentagem(valor, total) {
	if (total === 0) {
		return 0;  // Evita divisão por zero
	}
	return (valor / total) * 100;
}



function tipoValido(n1, n2) {
	if (typeof n1 !== 'string' && !Array.isArray(n1)) return;
	if (typeof n2 !== 'number') return;
	return true
}


module.exports = {
	HikDSK11: HikDSK11,
	HikAPI: HikAPI,
	encrypt: encrypt,
	decrypt: decrypt,

};

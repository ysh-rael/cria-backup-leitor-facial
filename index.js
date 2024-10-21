const readline = require('readline');
const helper = require('./helper');
const fs = require('fs');
const path = require('path');

const amarelo_ = '\x1b[33m%s\x1b[0m'
const misto___ = '\x1b[33m%s\x1b[31m%s\x1b[0m'
const vermelho = '\x1b[31m%s\x1b[0m'
const verde___ = '\x1b[32m%s\x1b[0m'

// Cria a interface para ler a entrada do terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Pergunta e captura a resposta com callback
function perguntar(pergunta, callback) {
    rl.question(pergunta, function (resposta) {
        callback(resposta);
    });
}

// Exibe o logo
asciiLogo();

// Função principal que realiza a execução das perguntas em sequência
function iniciar() {
    var options = {};

    perguntar('Exportar como? (cryp) [cryp|json]: ', function (exportarComo) {
        var exportarComo = /^(json|cryp)$/i.test(exportarComo) ? exportarComo.toLowerCase() : 'cryp';

        perguntar('Insira o local que deseja salvar o backup (caminho relativo): ', function (filePath) {
            console.log('Insira as credenciais do leitor facial');

            perguntar('IP:', function (ip) {
                options.ip = ip;

                perguntar('Porta: (80)', function (porta) {
                    options.port = porta || '80';

                    perguntar('Modelo (Hik-DSK1T): ', function (modelo) {
                        options.modelo = modelo || 'Hik-DSK1T' // modelo;

                        perguntar('Protocolo (http): ', function (protocolo) {
                            options.protocolo = protocolo || 'http' // protocolo;

                            perguntar('Usuário: ', function (usuario) {
                                options.usuario = usuario // usuario;

                                perguntar('Senha: ', function (senha) {
                                    options.senha = senha // senha;
                                    var nomeEquipamento = `HIK@${options.ip}`;

                                    // Agora que todas as perguntas foram feitas, execute seu código
                                    var arrayUser = [];
                                    var arrayOptions = [];
                                    var hikDSK11 = new helper.HikDSK11(options);

                                    hikDSK11.findUsers({ PaginateInitial: 0, maxResults: 1, employeeNo: [] })
                                        .then(function (body) {
                                            if (typeof body === 'object') {
                                                if (!body.UserInfoSearch.totalMatches) throw new Error('Nenhum usuário para ser exportado.');

                                                var __page = 0;
                                                var __limit = 30;
                                                var total = Number(body.UserInfoSearch.totalMatches);
                                                console.log(`\nTotal Usuários encontrados: ${total}`)

                                                while (__page * __limit < total) {
                                                    arrayOptions.push({
                                                        maxResults: __limit,
                                                        PaginateInitial: __page * __limit
                                                    });
                                                    __page++;
                                                }

                                                return;
                                            } else {
                                                throw new Error('Ocorreu um erro: Não foi possível obter nenhum usuário.');
                                            }
                                        })
                                        .then(function () {

                                            // Array com array de cardNo 
                                            const arrayCardNoList = []

                                            { // Escopo pois é utilizado nomeclaturas extremamente genéricas.

                                                var i = 0
                                                var __array = []
                                                arrayOptions.forEach(esse => {
                                                    if (i == 20) {
                                                        i = 0
                                                        arrayCardNoList.push(__array)
                                                        __array = []
                                                    }
                                                    i++
                                                    __array.push(esse)
                                                })
                                                arrayCardNoList.push(__array)
                                            }

                                            return Promise.all(arrayCardNoList.map(group =>
                                                Promise.all(group.map(function ($, index) {
                                                    return new Promise(function (resolve) {
                                                        var array = [];

                                                        hikDSK11.findUsers($)
                                                            .then(body => body.UserInfoSearch.UserInfo.forEach($ => array.push($)))
                                                            .then(() => array.forEach($ => arrayUser.push($)))
                                                            .then(resolve)
                                                            .catch(error => {
                                                                console.log(`Error catch [${index}]:`)
                                                                console.log(error)
                                                                resolve(error)
                                                            })

                                                    });
                                                }))
                                            ))

                                        })
                                        .then(function () {
                                            // COMEÇA BUSCA POR CARTÕES

                                            const groups = []
                                            const quantElem = 10
                                            const array = arrayUser.filter($ => $.numOfCard)

                                            { // Escopo pois é utilizado nomeclaturas extremamente genéricas.

                                                var i = 0
                                                var __array = []
                                                array.forEach($ => {
                                                    if (i == quantElem) {
                                                        i = 0
                                                        groups.push(__array)
                                                        __array = []
                                                    }
                                                    i++
                                                    __array.push({ searchResultPosition: 0, maxResults: 5, EmployeeNoList: [{ employeeNo: $.employeeNo }] })
                                                })
                                                groups.push(__array)
                                            }

                                            console.log('\n\nComeçando busca por cartões dos usuários')
                                            console.log(`A busca se dará por ${groups.length} grupos de até ${quantElem} usuários cada.`)

                                            return new Promise((resolve, reject) => {
                                                let index = -1
                                                let tentarNovamente = true

                                                function executaUmGrupoPorVez() {
                                                    index++
                                                    if (index === groups.length) return resolve()
                                                    return Promise.all(groups[index].map($ => hikDSK11.findCard($)))
                                                        .then(arrayBody => {
                                                            arrayBody.forEach(body => {
                                                                if (typeof body === 'object' && body.CardInfoSearch && Array.isArray(body.CardInfoSearch.CardInfo)) {
                                                                    body.CardInfoSearch.CardInfo.forEach($ => {
                                                                        const user = arrayUser.find(user => user.employeeNo == $.employeeNo) // aqui busco no arrayUser para que seja pego por referência e modificado no array que vai criar o backup; 
                                                                        if (!user) return
                                                                        if (!Array.isArray(user.CardInfo)) user.CardInfo = []
                                                                        user.CardInfo.push($)
                                                                    })
                                                                }
                                                            })
                                                        })
                                                        .then(() => console.log(verde___, `Grupo Cartão: ${index + 1}/${groups.length}`))
                                                        .then(() => tentarNovamente = true)
                                                        .then(setTimeout(executaUmGrupoPorVez, 800))
                                                        .catch(error => {
                                                            console.log(vermelho, `Grupo Cartão : ${index + 1}/${groups.length}  | ${error}`)

                                                            if (tentarNovamente) {
                                                                tentarNovamente = false
                                                                index--
                                                            }
                                                            setTimeout(executaUmGrupoPorVez, 1200)
                                                        })
                                                }

                                                return executaUmGrupoPorVez()
                                            })


                                        })
                                        .then(function () {
                                            // COMEÇA BUSCA FACE DO USUÁRIO

                                            const groups = []
                                            const quantElem = 5
                                            const array = arrayUser.filter($ => $.numOfFace)

                                            { // Escopo pois é utilizado nomeclaturas extremamente genéricas.

                                                var i = 0
                                                var __array = []
                                                array.forEach($ => {
                                                    if (i == quantElem) {
                                                        i = 0
                                                        groups.push(__array)
                                                        __array = []
                                                    }
                                                    i++
                                                    __array.push({ faceLibType: 'blackFD', FDID: '1', FPID: $.employeeNo })
                                                })
                                                groups.push(__array)
                                            }

                                            console.log('\n\nComeçando busca por Face dos usuários')
                                            console.log(`A busca se dará por ${groups.length} grupos de até ${quantElem} usuários cada.`)

                                            return new Promise((resolve, reject) => {
                                                let index = -1
                                                let tentarNovamente = true

                                                function executaUmGrupoPorVez() {
                                                    index++
                                                    if (index === groups.length) return resolve()
                                                    return Promise.all(groups[index].map($ => hikDSK11.findFace($)))
                                                        .then(arrayBody => arrayBody.map($ => $ && Array.isArray($.MatchList) ? $.MatchList[0] : null))
                                                        .then(arrayBody => Promise.all(arrayBody.map($ => {
                                                            if ($ && $.faceURL) {
                                                                try {
                                                                    return new Promise(resolve => setTimeout(() => resolve(hikDSK11.getRequest($.faceURL)), 200))
                                                                } catch (error) {
                                                                    console.log('error catch ao realizar hikDSK11.getRequest(url). não foi possível obter face do usuário.')
                                                                    console.log('Verificar se a imagem está salva no leitor facial.')
                                                                    return null
                                                                }

                                                            } else return null

                                                        })))
                                                        .then(arrayImagesBuffers => arrayImagesBuffers.forEach(($, i) => $ ? array[i].image = $ : false))
                                                        .then(() => {
                                                            array.forEach(elem => {
                                                                const user = arrayUser.find($ => $.employeeNo === elem.employeeNo)
                                                                user.image = elem.image
                                                            })
                                                        })
                                                        .then(() => console.log(verde___, `Grupo Face: ${index + 1}/${groups.length}`))
                                                        .then(() => tentarNovamente = true)
                                                        .then(setTimeout(executaUmGrupoPorVez, 800))
                                                        .catch(error => {
                                                            console.log(vermelho, `Grupo Face : ${index + 1}/${groups.length}  | ${error}`)

                                                            if (tentarNovamente) {
                                                                tentarNovamente = false
                                                                index--
                                                            }
                                                            setTimeout(executaUmGrupoPorVez, 1200)
                                                        })
                                                }

                                                return executaUmGrupoPorVez()
                                            })


                                        })
                                        .then(function () {
                                            // SUFIXO e exportação de conteúdo
                                            var sufixoData = new Date().toLocaleString().replace(/(\/|:)/g, '-');
                                            var nomeArquivo = `${nomeEquipamento}_backup_${sufixoData}.${exportarComo}`;

                                            const options = []

                                            // Retorna o json formatado
                                            if (/json/.test(exportarComo)) {
                                                options.push(null)
                                                options.push(2)
                                            }

                                            console.log(verde___, `\n\nTotal usuários exportados: ${arrayUser.length}\n`)

                                            // INICIA O CONTEUDO COMO JSON
                                            var content = JSON.stringify(arrayUser, ...options)

                                            // Criptografa Conteudo. Use helper.helper.decrypt para descriptografar.
                                            if (/cryp/.test(exportarComo)) content = helper.encrypt(content)

                                            fs.writeFileSync(path.join(filePath, nomeArquivo), content, 'utf8');
                                            console.log({ err: 0, message: 'Finalizado com sucesso.' });
                                            rl.close();
                                        })
                                        .catch(function (error) {
                                            console.log({ err: 1, message: error.message });
                                            rl.close();
                                        });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}


iniciar()

function asciiLogo() {
    if (console.clear) console.clear()

    console.log(amarelo_, '               (    (      ');
    console.log(amarelo_, '       (    (  )\\ ) )\\ ) ');
    console.log(amarelo_, '       )\\ ( )\\(()/((()/( ');
    console.log(amarelo_, '     (((_))((_)/(_))/(_))  ');
    console.log(amarelo_, '     )\\__((_)_(_)) (_))_| ');
    console.log(misto___, '    ((', '/ __| _ ) |  | |_');
    console.log(vermelho, '     | (__| _ \\ |__| __|  ');
    console.log(vermelho, '      \\___|___/____|_|    ');
    console.log(' Criador Backup Leitor Facial')

    console.log(verde___, '\n   https://github.com/cryp-rael/');
    console.log('      V1.0.12 | cryp-rael\n\n');
}

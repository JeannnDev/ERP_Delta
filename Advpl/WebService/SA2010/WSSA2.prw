
/**-------------------------------------------------------------------------------------------**/
/** PROJETO	      : WebService para Cadastro de Fornecedores						          **/
/** DATA 		  : 21/03/2026														          **/
/** RESPONSÁVEL	  : Jean Correa                    	  										  **/
/**-------------------------------------------------------------------------------------------**/
/**                                 DECLARAÇÃO DAS BIBLIOTECAS                                **/
/**-------------------------------------------------------------------------------------------**/
#Include "rwmake.ch"
#Include "protheus.ch"
#Include "tbiconn.ch"
#Include "topconn.ch"
#Include "totvs.ch"
#Include "restful.ch"

#Define ENTER CHR(13)+CHR(10)

WSRESTFUL WsFornecedor DESCRIPTION "Servico para cadastro de Fornecedores." FORMAT "application/json"

    WSDATA filial AS String
    WSDATA cCgc   AS String

    WSMETHOD POST   DESCRIPTION "Inclusao de cadastro de Fornecedores." WSSYNTAX "/WsFornecedor/INCLUIR/{CGC}"
    WSMETHOD PUT    DESCRIPTION "Alteracao de cadastro de Fornecedores." WSSYNTAX "/WsFornecedor/ALTERAR/{CGC}"
    WSMETHOD DELETE DESCRIPTION "Exclusao de cadastro de Fornecedores." WSSYNTAX "/WsFornecedor/EXCLUIR/{CGC}"
    WSMETHOD GET    DESCRIPTION "Consulta Fornecedor." WSSYNTAX "/WsFornecedor/{CGC}"

END WSRESTFUL

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : POST												            	          **/
/** DESCRICAO	: Metodo de Inclusão de Fornecedores									      **/
/**-------------------------------------------------------------------------------------------**/

WSMETHOD POST WSRECEIVE RECEIVE WSSERVICE WsFornecedor

    Local aArea        := GetArea()
    Local aCampos      := {}
    Local cJson        := ""
    Local oJson        := Nil
    Local aRet         := {.F.,""}
    Local cCgc         := ""
    Local cEst         := ""
    Local cMun         := ""
    Local nX           := 0
    Local nOper        := 3
    Private oIntegracao := JsonObject():New()

    oIntegracao['response'] := ""
    oIntegracao['success']  := .T.

    ::SetContentType("application/json")

    If Len(::cCgc) < 1
        U_SetErro("CGC não informado.")
        Return .T.
    EndIf

    cCgc := PadR(::cCgc, TamSX3("A2_CGC")[1], " ")

    cJson := Self:GetContent()

    If FWJsonDeserialize(cJson, @oJson)

        // RpcClearEnv()
        // RpcSetType(3)

        // If RpcSetEnv("01", ::FILIAL, Nil, Nil, "COM", Nil, {"SA2","CC2"})

            CC2->(DbSetOrder(4))
            SA2->(DbSetOrder(3))

            If SA2->(DBSeek(xFilial("SA2") + cCgc))
                U_SetErro("CNPJ/CPF já cadastrado no Protheus.")
            EndIf

            If oIntegracao['success']

                aADD(aCampos, { "A2_CGC", cCgc })

                For nX := 1 To Len(oJson:Data)

                    cCampo := AllTrim(oJson:Data[nX]["campo"])
                    xValor := U_ConvT(oJson:Data[nX]["tipo"], oJson:Data[nX]["valor"])

                    aADD(aCampos, { cCampo, xValor })

                    If cCampo == "CC2_EST"
                        cEst := PadR(xValor, TamSX3("CC2_EST")[1], " ")
                    EndIf

                    If cCampo == "CC2_MUN"
                        cMun := PadR(xValor, TamSX3("CC2_MUN")[1], " ")
                    EndIf

                Next

                If !Empty(cEst) .And. !Empty(cMun)

                    If !CC2->(DbSeek(xFilial("CC2") + cEst + cMun))
                        U_SetErro("Codigo do municipio não encontrado no Protheus.")
                    Else
                        aADD(aCampos, { "A2_COD_MUN", CC2->CC2_CODMUN })
                    EndIf

                EndIf

                If oIntegracao['success']

                    aRet := U_MT020MVC(aCampos, nOper)

                    If aRet[1]
                        oIntegracao['response'] := aRet[2]
                    Else
                        U_SetErro(aRet[2])
                    EndIf

                EndIf

        //     EndIf

        // Else
        //     U_SetErro("Não foi possível conectar na empresa e filial informados.")
        EndIf

    Else
        U_SetErro("Nao foi possivel deserializar o objeto Json recebido na requisicao.")
    EndIf

    ::SetResponse(oIntegracao:toJson())

    RestArea(aArea)
    RpcClearEnv()

Return .T.

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO          : GET													            	  **/
/** DESCRICAO	    : Metodo de Consulta de Fornecedores									  **/
/**-------------------------------------------------------------------------------------------**/

WSMETHOD GET WSRECEIVE RECEIVE WSSERVICE WsFornecedor

    Local aArea 				       := GetArea()
    Local aCampos				       := {}
    Local aRet					       := {}
    Local cCgc 					       := ""
    Local nX						   := 0
    Private oIntegracao := JsonObject():New()

    oIntegracao['response'] := ""
    oIntegracao['success'] 	:= .T.
    oIntegracao['data'] 	:= ""

    // RpcClearEnv()
    // RpcSetType(3)

    // If RpcSetEnv("01", ::FILIAL, Nil, Nil, "COM", Nil, {"SA2"})

        SA2->(DbSetOrder(3))

        cCgc 	:= ::cCgc
        cCgc 	:= PadR(cCgc, TamSX3("A2_CGC")[1]," ")

        If SA2->(DbSeek(xFilial("SA2") + cCgc ))

            aADD(aCampos, "A2_COD")
            aADD(aCampos, "A2_LOJA")
            aADD(aCampos, "A2_NOME")
            aADD(aCampos, "A2_NREDUZ")
            aADD(aCampos, "A2_END")
            aADD(aCampos, "A2_BAIRRO")
            aADD(aCampos, "A2_EST")
            aADD(aCampos, "A2_CEP")
            aADD(aCampos, "A2_TIPO")
            aADD(aCampos, "A2_PFISICA")
            aADD(aCampos, "A2_DDD")
            aADD(aCampos, "A2_TEL")
            aADD(aCampos, "A2_EMAIL")

            For nX := 1 To Len(aCampos)

                aADD(aRet, { aCampos[nX], &("SA2->"+aCampos[nX]) })

            Next nX

            oIntegracao['data'] = aRet

        Else
            U_SetErro("Fornecedor não encontrado.")
        EndIf

    // Else
    //     U_SetErro("Não foi possível conectar na empresa e filial informados.")
    // EndIf

    ::SetResponse(oIntegracao:toJson())

    RestArea(aArea)

    RpcClearEnv()

Return .T.


/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : PUT                                                                         **/
/** DESCRICAO   : Metodo de Alteração de Fornecedores                                         **/
/**-------------------------------------------------------------------------------------------**/

WSMETHOD PUT WSRECEIVE RECEIVE WSSERVICE WsFornecedor

    Local aArea        := GetArea()
    Local aCampos      := {}
    Local cJson        := ""
    Local oJson        := Nil
    Local aRet         := {.F.,""}
    Local cCgc         := ""
    Local cEst         := ""
    Local cMun         := ""
    Local nX           := 0
    Local nOper        := 4
    Private oIntegracao := JsonObject():New()

    oIntegracao['response'] := ""
    oIntegracao['success']  := .T.

    ::SetContentType("application/json")

    If Len(::cCgc) < 1
        U_SetErro("CGC não informado.")
        Return .T.
    EndIf

    cCgc := PadR(::cCgc, TamSX3("A2_CGC")[1], " ")

    cJson := Self:GetContent()

    If FWJsonDeserialize(cJson, @oJson)

        // RpcClearEnv()
        // RpcSetType(3)

        // If RpcSetEnv("01", ::FILIAL, Nil, Nil, "COM", Nil, {"SA2","CC2"})

            CC2->(DbSetOrder(4))
            SA2->(DbSetOrder(3))

            If !SA2->(DBSeek(xFilial("SA2") + cCgc))
                U_SetErro("Fornecedor não encontrado.")
            EndIf

            If oIntegracao['success']

                aADD(aCampos, { "A2_CGC", cCgc })
                aADD(aCampos, { "A2_COD",  SA2->A2_COD })
                aADD(aCampos, { "A2_LOJA", SA2->A2_LOJA })

                For nX := 1 To Len(oJson:Data)

                    cCampo := AllTrim(oJson:Data[nX]["campo"])
                    xValor := U_ConvT(oJson:Data[nX]["tipo"], oJson:Data[nX]["valor"])

                    If cCampo != "A2_CGC"
                        aADD(aCampos, { cCampo, xValor })
                    EndIf

                    If cCampo == "CC2_EST"
                        cEst := PadR(xValor, TamSX3("CC2_EST")[1], " ")
                    EndIf

                    If cCampo == "CC2_MUN"
                        cMun := PadR(xValor, TamSX3("CC2_MUN")[1], " ")
                    EndIf

                Next

                If !Empty(cEst) .And. !Empty(cMun)

                    If !CC2->(DbSeek(xFilial("CC2") + cEst + cMun))
                        U_SetErro("Codigo do municipio não encontrado no Protheus.")
                    Else
                        aADD(aCampos, { "A2_COD_MUN", CC2->CC2_CODMUN })
                    EndIf

                EndIf

                If oIntegracao['success']

                    aRet := U_MT020MVC(aCampos, nOper)

                    If aRet[1]
                        oIntegracao['response'] := aRet[2]
                    Else
                        U_SetErro(aRet[2])
                    EndIf

                EndIf

        //     EndIf

        // Else
        //     U_SetErro("Não foi possível conectar na empresa e filial informados.")
        EndIf

    Else
        U_SetErro("Não foi possível deserializar o objeto Json recebido na requisição.")
    EndIf

    ::SetResponse(oIntegracao:toJson())

    RestArea(aArea)
    RpcClearEnv()

Return .T.

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : DELETE                                                                      **/
/** DESCRICAO   : Metodo de Exclusão de Fornecedores                                          **/
/**-------------------------------------------------------------------------------------------**/

WSMETHOD DELETE WSRECEIVE RECEIVE WSSERVICE WsFornecedor

    Local aArea        := GetArea()
    Local aCampos      := {}
    Local aRet         := {.F.,""}
    Local cCgc         := ""
    Local nOper        := 5
    Private oIntegracao := JsonObject():New()

    oIntegracao['response'] := ""
    oIntegracao['success']  := .T.

    ::SetContentType("application/json")

    If Len(::cCgc) < 1
        U_SetErro("CGC não informado.")
        Return .T.
    EndIf

    cCgc := PadR(::cCgc, TamSX3("A2_CGC")[1], " ")

    // RpcClearEnv()
    // RpcSetType(3)

    // If RpcSetEnv("01", ::FILIAL, Nil, Nil, "COM", Nil, {"SA2"})

        SA2->(DbSetOrder(3))

        If !SA2->(DBSeek(xFilial("SA2") + cCgc))
            U_SetErro("Fornecedor não encontrado.")
        Else

            aADD(aCampos, { "A2_CGC",  cCgc })
            aADD(aCampos, { "A2_COD",  SA2->A2_COD })
            aADD(aCampos, { "A2_LOJA", SA2->A2_LOJA })

            aRet := U_MT020MVC(aCampos, nOper)

            If aRet[1]
                oIntegracao['response'] := aRet[2]
            Else
                U_SetErro(aRet[2])
            EndIf

        EndIf

    // Else
    //     U_SetErro("Não foi possível conectar na empresa e filial informados.")
    // EndIf

    ::SetResponse(oIntegracao:toJson())

    RestArea(aArea)
    RpcClearEnv()

Return .T.

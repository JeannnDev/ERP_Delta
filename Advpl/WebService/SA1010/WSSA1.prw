
/**-------------------------------------------------------------------------------------------**/
/** PROJETO       : WebService para Cadastro de Clientes (SA1)                               **/
/** DATA          : 29/03/2026                                                                **/
/** RESPONSAVEL   : Jean Correa                                                               **/
/**-------------------------------------------------------------------------------------------**/
/**                                 DECLARACAO DAS BIBLIOTECAS                                **/
/**-------------------------------------------------------------------------------------------**/
#Include "rwmake.ch"
#Include "protheus.ch"
#Include "tbiconn.ch"
#Include "topconn.ch"
#Include "totvs.ch"
#Include "restful.ch"

#Define ENTER CHR(13)+CHR(10)

WSRESTFUL WsCliente DESCRIPTION "Servico para cadastro de Clientes." FORMAT "application/json"

    WSDATA filial AS String
    WSDATA cCgc   AS String

    WSMETHOD POST   DESCRIPTION "Inclusao de cadastro de Clientes."  WSSYNTAX "/WsCliente/INCLUIR/{CGC}"
    WSMETHOD PUT    DESCRIPTION "Alteracao de cadastro de Clientes." WSSYNTAX "/WsCliente/ALTERAR/{CGC}"
    WSMETHOD DELETE DESCRIPTION "Exclusao de cadastro de Clientes."  WSSYNTAX "/WsCliente/EXCLUIR/{CGC}"
    WSMETHOD GET    DESCRIPTION "Consulta Cliente."                  WSSYNTAX "/WsCliente/{CGC}"

END WSRESTFUL

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : POST                                                                        **/
/** DESCRICAO   : Metodo de Inclusao de Clientes                                             **/
/**-------------------------------------------------------------------------------------------**/

WSMETHOD POST WSRECEIVE RECEIVE WSSERVICE WsCliente

    Local aArea         := GetArea()
    Local aCampos       := {}
    Local cJson         := ""
    Local oJson         := Nil
    Local aRet          := {.F., ""}
    Local cCgc          := ""
    Local nX            := 0
    Local nOper         := 3
    Private oIntegracao := JsonObject():New()

    oIntegracao['response'] := ""
    oIntegracao['success']  := .T.

    ::SetContentType("application/json")

    If Len(::cCgc) < 1
        U_SetErro__("CGC nao informado.")
        Return .T.
    EndIf

    cCgc  := PadR(::cCgc, TamSX3("A1_CGC")[1], " ")
    cJson := Self:GetContent()

    If FWJsonDeserialize(cJson, @oJson)

        SA1->(DbSetOrder(3))

        If SA1->(DBSeek(xFilial("SA1") + cCgc))
            U_SetErro__("CNPJ/CPF ja cadastrado no Protheus.")
        EndIf

        If oIntegracao['success']

            aADD(aCampos, {"A1_CGC", cCgc})

            For nX := 1 To Len(oJson:Data)
                aADD(aCampos, {;
                    AllTrim(oJson:Data[nX]["campo"]),;
                    U_ConvT__(oJson:Data[nX]["tipo"], oJson:Data[nX]["valor"]);
                })
            Next

            aRet := U_MT030MVC__(aCampos, nOper)

            If aRet[1]
                oIntegracao['response'] := aRet[2]
            Else
                U_SetErro__(aRet[2])
            EndIf

        EndIf

    Else
        U_SetErro__("Nao foi possivel deserializar o objeto Json recebido na requisicao.")
    EndIf

    ::SetResponse(oIntegracao:toJson())

    RestArea(aArea)
    RpcClearEnv()

Return .T.

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : GET                                                                         **/
/** DESCRICAO   : Metodo de Consulta de Clientes                                             **/
/**-------------------------------------------------------------------------------------------**/

WSMETHOD GET WSRECEIVE RECEIVE WSSERVICE WsCliente

    Local aArea         := GetArea()
    Local aCampos       := {}
    Local aRet          := {}
    Local cCgc          := ""
    Local nX            := 0
    Private oIntegracao := JsonObject():New()

    oIntegracao['response'] := ""
    oIntegracao['success']  := .T.
    oIntegracao['data']     := ""

    SA1->(DbSetOrder(3))

    cCgc := PadR(::cCgc, TamSX3("A1_CGC")[1], " ")

    If SA1->(DbSeek(xFilial("SA1") + cCgc))

        aADD(aCampos, "A1_COD")
        aADD(aCampos, "A1_LOJA")
        aADD(aCampos, "A1_NOME")
        aADD(aCampos, "A1_NREDUZ")
        aADD(aCampos, "A1_PESSOA")
        aADD(aCampos, "A1_CGC")
        aADD(aCampos, "A1_END")
        aADD(aCampos, "A1_BAIRRO")
        aADD(aCampos, "A1_MUN")
        aADD(aCampos, "A1_EST")
        aADD(aCampos, "A1_CEP")
        aADD(aCampos, "A1_TEL")
        aADD(aCampos, "A1_EMAIL")

        For nX := 1 To Len(aCampos)
            aADD(aRet, {aCampos[nX], &("SA1->" + aCampos[nX])})
        Next nX

        oIntegracao['data'] := aRet

    Else
        U_SetErro__("Cliente nao encontrado.")
    EndIf

    ::SetResponse(oIntegracao:toJson())

    RestArea(aArea)
    RpcClearEnv()

Return .T.

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : PUT                                                                         **/
/** DESCRICAO   : Metodo de Alteracao de Clientes                                            **/
/**-------------------------------------------------------------------------------------------**/

WSMETHOD PUT WSRECEIVE RECEIVE WSSERVICE WsCliente

    Local aArea         := GetArea()
    Local aCampos       := {}
    Local cJson         := ""
    Local oJson         := Nil
    Local aRet          := {.F., ""}
    Local cCgc          := ""
    Local nX            := 0
    Local nOper         := 4
    Private oIntegracao := JsonObject():New()

    oIntegracao['response'] := ""
    oIntegracao['success']  := .T.

    ::SetContentType("application/json")

    If Len(::cCgc) < 1
        U_SetErro__("CGC nao informado.")
        Return .T.
    EndIf

    cCgc  := PadR(::cCgc, TamSX3("A1_CGC")[1], " ")
    cJson := Self:GetContent()

    If FWJsonDeserialize(cJson, @oJson)

        SA1->(DbSetOrder(3))

        If !SA1->(DBSeek(xFilial("SA1") + cCgc))
            U_SetErro__("Cliente nao encontrado.")
        EndIf

        If oIntegracao['success']

            aADD(aCampos, {"A1_CGC",  cCgc})
            aADD(aCampos, {"A1_COD",  SA1->A1_COD})
            aADD(aCampos, {"A1_LOJA", SA1->A1_LOJA})

            For nX := 1 To Len(oJson:Data)
                If AllTrim(oJson:Data[nX]["campo"]) != "A1_CGC"
                    aADD(aCampos, {;
                        AllTrim(oJson:Data[nX]["campo"]),;
                        U_ConvT__(oJson:Data[nX]["tipo"], oJson:Data[nX]["valor"]);
                    })
                EndIf
            Next

            aRet := U_MT030MVC__(aCampos, nOper)

            If aRet[1]
                oIntegracao['response'] := aRet[2]
            Else
                U_SetErro__(aRet[2])
            EndIf

        EndIf

    Else
        U_SetErro__("Nao foi possivel deserializar o objeto Json recebido na requisicao.")
    EndIf

    ::SetResponse(oIntegracao:toJson())

    RestArea(aArea)
    RpcClearEnv()

Return .T.

/**-------------------------------------------------------------------------------------------**/
/** FUNCAO      : DELETE                                                                      **/
/** DESCRICAO   : Metodo de Exclusao de Clientes                                             **/
/**-------------------------------------------------------------------------------------------**/

WSMETHOD DELETE WSRECEIVE RECEIVE WSSERVICE WsCliente

    Local aArea         := GetArea()
    Local aCampos       := {}
    Local aRet          := {.F., ""}
    Local cCgc          := ""
    Local nOper         := 5
    Private oIntegracao := JsonObject():New()

    oIntegracao['response'] := ""
    oIntegracao['success']  := .T.

    ::SetContentType("application/json")

    If Len(::cCgc) < 1
        U_SetErro__("CGC nao informado.")
        Return .T.
    EndIf

    cCgc := PadR(::cCgc, TamSX3("A1_CGC")[1], " ")

    SA1->(DbSetOrder(3))

    If !SA1->(DBSeek(xFilial("SA1") + cCgc))
        U_SetErro__("Cliente nao encontrado.")
    Else

        aADD(aCampos, {"A1_CGC",  cCgc})
        aADD(aCampos, {"A1_COD",  SA1->A1_COD})
        aADD(aCampos, {"A1_LOJA", SA1->A1_LOJA})

        aRet := U_MT030MVC__(aCampos, nOper)

        If aRet[1]
            oIntegracao['response'] := aRet[2]
        Else
            U_SetErro__(aRet[2])
        EndIf

    EndIf

    ::SetResponse(oIntegracao:toJson())

    RestArea(aArea)
    RpcClearEnv()

Return .T.

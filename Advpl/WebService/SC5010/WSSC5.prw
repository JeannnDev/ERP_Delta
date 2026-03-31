/**-------------------------------------------------------------------------------------------**/
/** PROJETO       : WebService para Pedido de Venda                                           **/
/** DATA          : 30/03/2026                                                                **/
/** RESPONSÁVEL   : Jean Correa                                                               **/
/**-------------------------------------------------------------------------------------------**/

#Include "rwmake.ch"
#Include "protheus.ch"
#Include "tbiconn.ch"
#Include "topconn.ch"
#Include "totvs.ch"
#Include "restful.ch"

#Define ENTER CHR(13)+CHR(10)

WSRESTFUL WSPedidoVenda DESCRIPTION 'WS para pedidos de venda' FORMAT "application/json"
    WSMETHOD POST DESCRIPTION "Inclusao de pedidos de venda." WSSYNTAX "/WsPedidoVenda"
END WSRESTFUL

WSMETHOD POST WSRECEIVE RECEIVE WSSERVICE WSPedidoVenda
    Local aArea       := GetArea()
    Local cBody       := Self:GetContent()
    Local oJson       := JsonObject():New()
    Local nSuccess    := 0
    Local nErrors     := 0
    Local nDuplicates := 0
    Local nX          := 0
    Local nY          := 0
    Local nI          := 0
    Local lOk         := .T.
    Local cMsgLog     := ""
    Local aCab        := {}
    Local aItens      := {}
    Local aItem       := {}
    Local cError      := Nil
    Local cMsgTemp    := ""
    Local oPedido     := Nil
    Local oItemPlan   := Nil
    Local aItensRes   := {}
    Local aItensJson  := {}
    Private oItemRes  := Nil

    Private oResponse := JsonObject():New()
    Private lMsErroAuto    := .F.
    Private lAutoErrNoFile := .T.

    Self:SetContentType("application/json")

    If oJson:FromJson(cBody) <> Nil
        oResponse:Set("sucesso", 0)
        oResponse:Set("mensagem", "Payload JSON invalido ou mal formatado.")
        Self:SetResponse(oResponse:toJson())
        Return .T.
    EndIf

    aItensJson := oJson:GetJsonObject('pedidos')

    oResponse:Set("total", Len(aItensJson))
    oResponse:Set("sucesso", 0)
    oResponse:Set("erros", 0)
    oResponse:Set("duplicados", 0)

    For nX := 1 To Len(aItensJson)
        lOk     := .T.
        cMsgLog := ""
        oPedido := aItensJson[nX]

        DbSelectArea("SC5")
        SC5->(DbOrderNickName("idext"))
        If SC5->(DbSeek(xFilial("SC5") + PadR(oPedido:GetJsonObject('C5_EXTERNO'), 20)))
            lOk := .F.
            cMsgLog := "Pedido Externo ja importado (Duplicado)."
            nDuplicates++

            oItemRes := JsonObject():New()
            oItemRes:Set("pedidoExterno", oPedido:GetJsonObject('C5_EXTERNO'))
            oItemRes:Set("status", "duplicado")
            oItemRes:Set("mensagem", cMsgLog)
            aAdd(aItensRes, oItemRes)
            Loop
        EndIf

        DbSelectArea("SA1")
        DbSetOrder(1)
        If !SA1->(DbSeek(xFilial("SA1") + PadR(cValToChar(oPedido:GetJsonObject('C5_CLIENTE')), 6)))
            lOk := .F.
            cMsgLog += "Cliente [" + cValToChar(oPedido:GetJsonObject('C5_CLIENTE')) + "] nao existe. "
        EndIf

        DbSelectArea("SE4")
        DbSetOrder(1)
        If !SE4->(DbSeek(xFilial("SE4") + PadR(cValToChar(oPedido:GetJsonObject('C5_CONDPAG')), 3)))
            lOk := .F.
            cMsgLog += "CondPg [" + cValToChar(oPedido:GetJsonObject('C5_CONDPAG')) + "] invalida. "
        EndIf

        If lOk
            aCab    := {}
            aItens  := {}

            aAdd(aCab, {"C5_TIPO"   , "N"                                     , Nil})
            aAdd(aCab, {"C5_LOJA"   , "01"                                    , Nil})
            aAdd(aCab, {"C5_CONDPAG", "0", Nil})
            aAdd(aCab, {"C5_XORIG"  , cValToChar(oJson:GetJsonObject('origem')), Nil})
            aAdd(aCab, {"C5_IDEXT"  , PadR(oPedido:GetJsonObject('C5_EXTERNO'), 20)  , Nil})
            aAdd(aCab, {"C5_CLIENTE", PadR(cValToChar(oPedido:GetJsonObject('C5_CLIENTE')), 6) , Nil})
            aAdd(aCab, {"C5_EMISSAO", STOD(StrTran(cValToChar(oPedido:GetJsonObject('C5_EMISSAO')), "-", "")), Nil})

            aItensDepto := oPedido:GetJsonObject('itens')

            If ValType(aItensDepto) == "A" .And. Len(aItensDepto) > 0
                For nY := 1 To Len(aItensDepto)
                    oItemPlan := aItensDepto[nY]
                    aItem     := {}

                    DbSelectArea("SB1")
                    DbSetOrder(1)
                    If !SB1->(DbSeek(xFilial("SB1") + PadR(cValToChar(oItemPlan:GetJsonObject('C6_PRODUTO')), 15)))
                        lOk := .F.
                        cMsgLog += "Produto " + cValToChar(oItemPlan:GetJsonObject('C6_PRODUTO')) + " nao existe. "
                        Exit
                    EndIf

                    aAdd(aItem, {"C6_ITEM"   , PadL(cValToChar(oItemPlan:GetJsonObject('C6_ITEM')), 2, "0"), Nil})
                    aAdd(aItem, {"C6_PRODUTO", PadR(cValToChar(oItemPlan:GetJsonObject('C6_PRODUTO')), 15), Nil})
                    aAdd(aItem, {"C6_QTDVEN" , Val(cValToChar(oItemPlan:GetJsonObject('C6_QTDVEN')))   , Nil})
                    aAdd(aItem, {"C6_PRCVEN" , Val(cValToChar(oItemPlan:GetJsonObject('C6_PRCVEN')))   , Nil})
                    aAdd(aItem, {"C6_TES"    , "501"                          , Nil})
                    aAdd(aItens, aItem)
                Next nY
            Else
                cMsgLog := "Itens nao encontrados no JSON."
            EndIf

            If lOk
                lMsErroAuto := .F.
                MSExecAuto({|x,y,z| MATA410(x,y,z)}, aCab, aItens, 3)

                oItemRes := JsonObject():New()
                oItemRes:Set("pedidoExterno", oPedido:GetJsonObject('C5_EXTERNO'))

                If !lMsErroAuto
                    nSuccess++
                    oItemRes:Set("numeroPedido", SC5->C5_NUM)
                    oItemRes:Set("status", "sucesso")
                    oItemRes:Set("mensagem", "Gerado com sucesso")
                Else
                    nErrors++
                    cError := GetAutoGRLog()

                    If ValType(cError) == "A"
                        cMsgTemp := ""
                        For nI := 1 To Len(cError)
                            cMsgTemp += cError[nI] + " / "
                        Next nI
                        cError := cMsgTemp
                    ElseIf ValType(cError) == "C"
                        cError := StrTran(cError, ENTER, " / ")
                    Else
                        cError := "Erro interno na MSExecAuto."
                    EndIf

                    oItemRes:Set("status", "erro")
                    oItemRes:Set("mensagem", cError)
                EndIf
                aAdd(aItensRes, oItemRes)
            Else
                nErrors++
                oItemRes := JsonObject():New()
                oItemRes:Set("pedidoExterno", oPedido:GetJsonObject('C5_EXTERNO'))
                oItemRes:Set("status", "erro")
                oItemRes:Set("mensagem", cMsgLog)
                aAdd(aItensRes, oItemRes)
            EndIf
        Else
            nErrors++
            oItemRes := JsonObject():New()
            oItemRes:Set("pedidoExterno", oPedido:GetJsonObject('C5_EXTERNO'))
            oItemRes:Set("status", "erro")
            oItemRes:Set("mensagem", cMsgLog)
            aAdd(aItensRes, oItemRes)
        EndIf
    Next nX

    oResponse:Set("sucesso", nSuccess)
    oResponse:Set("erros", nErrors)
    oResponse:Set("duplicados", nDuplicates)
    oResponse:Set("itens", aItensRes)

    Self:SetResponse(oResponse:toJson())

    RestArea(aArea)
    FreeObj(oJson)
    RpcClearEnv()

Return .T.

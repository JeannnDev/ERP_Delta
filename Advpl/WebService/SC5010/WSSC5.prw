
/**-------------------------------------------------------------------------------------------**/
/** MODULO		  : SIGA		                      										  **/
/** PROJETO	      : WebService para Pedido de Venda						                      **/
/** DATA 		  : 27/03/2026														          **/
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

WSRESTFUL WSPedidoVenda DESCRIPTION 'WS para pedidos de venda'

    WSMETHOD POST DESCRIPTION "Inclusao de pedidos de venda." WSSYNTAX "/WsPedidoVenda"

END WSRESTFUL


WSMETHOD POST WSSERVICE WSPedidoVenda
    Local aArea     := GetArea()
    Local cBody     := ::GetContent()
    Local oJson     := Nil
    Local oResponse := JsonObject():New()
    Local nSuccess  := 0
    Local nErrors   := 0
    Local nDuplicates := 0
    Local nX        := 0
    Local lOk       := .T.
    Local cMsgLog   := ""
    Local aCab      := {}
    Local aItens    := {}
    Local aItem     := {}
    Local lMsErroAuto := .F.
    Local cError    := ""

    RpcSetEnv("01", "99")

    FWJsonDeserialize(cBody, @oJson)

    If oJson == Nil
        Self:SetResponse('{"error": "Payload JSON invalido ou vazio"}')
        Return .F.
    EndIf

    oResponse['total']      := Len(oJson:pedidos)
    oResponse['sucesso']    := 0
    oResponse['erros']      := 0
    oResponse['duplicados'] := 0
    oResponse['itens']      := {}

    For nX := 1 To Len(oJson:pedidos)
        lOk     := .T.
        cMsgLog := ""

        DbSelectArea("SC5")
        DbSetOrder(1)
        If SC5->(DbSeek(xFilial("SC5") + PadR(oJson:pedidos[nX]:C5_EXTERNO, 20)))
            lOk := .F.
            cMsgLog := "Pedido Externo ja importado anteriormente (Duplicado)."
            nDuplicates++
            aAdd(oResponse['itens'], { "pedidoExterno": oJson:pedidos[nX]:C5_EXTERNO, "status": "duplicado", "mensagem": cMsgLog })
            Loop
        EndIf

        DbSelectArea("SA1")
        DbSetOrder(1)
        If !SA1->(DbSeek(xFilial("SA1") + PadR(oJson:pedidos[nX]:C5_CLIENTE, 6)))
            lOk := .F.
            cMsgLog += "Cliente [" + oJson:pedidos[nX]:C5_CLIENTE + "] nao cadastrado. "
        EndIf

        DbSelectArea("SB1")
        DbSetOrder(1)
        If !SB1->(DbSeek(xFilial("SB1") + PadR(oJson:pedidos[nX]:C6_PRODUTO, 15)))
            lOk := .F.
            cMsgLog += "Produto [" + oJson:pedidos[nX]:C6_PRODUTO + "] nao encontrado. "
        EndIf

        If oJson:pedidos[nX]:C6_QTDVEN <= 0
            lOk := .F.
            cMsgLog += "Quantidade deve ser maior que zero. "
        EndIf
        If oJson:pedidos[nX]:C6_PRCVEN <= 0
            lOk := .F.
            cMsgLog += "Preco deve ser maior que zero. "
        EndIf

        If lOk
            aCab    := {}
            aItens  := {}
            aItem   := {}
            oPedido := oJson:pedidos[nX]

            aAdd(aCab, {"C5_TIPO"   , "N"                          , Nil})
            aAdd(aCab, {"C5_LOJA"   , "01"                         , Nil})
            aAdd(aCab, {"C5_CONDPAG", "001"                        , Nil})
            aAdd(aCab, {"C5_ORIGEM" , oJson:origem                 , Nil})

            aProps := oPedido:GetNames()
            For nP := 1 To Len(aProps)
                cCampo := aProps[nP]
                xValor := oPedido[cCampo]

                If Left(cCampo, 3) == "C5_"
                    aAdd(aCab, { cCampo, xValor, Nil })
                ElseIf Left(cCampo, 3) == "C6_"
                    aAdd(aItem, { cCampo, xValor, Nil })
                EndIf
            Next nP

            aAdd(aItem, {"C6_PRUNIT", oPedido:C6_PRCVEN, Nil})
            aAdd(aItem, {"C6_TES", "501", Nil})
            aAdd(aItens, aItem)

            lMsErroAuto := .F.
            MSExecAuto({|x,y,z| MATA410(x,y,z)}, aCab, aItens, 3)

            If !lMsErroAuto
                nSuccess++
                aAdd(oResponse['itens'], { "pedidoExterno": oPedido:C5_EXTERNO, "numeroPedido": SC5->C5_NUM, "status": "sucesso", "mensagem": "Gerado com sucesso" })
            Else
                nErrors++
                cError := GetAutoGRLog()
                aAdd(oResponse['itens'], { "pedidoExterno": oPedido:C5_EXTERNO, "status": "erro", "mensagem": cError })
            EndIf
        Else
            nErrors++
            aAdd(oResponse['itens'], { "pedidoExterno": oJson:pedidos[nX]:C5_EXTERNO, "status": "erro", "mensagem": cMsgLog })
        EndIf
    Next nX

    oResponse['sucesso']    := nSuccess
    oResponse['erros']      := nErrors
    oResponse['duplicados'] := nDuplicates

    Self:SetContentType('application/json')
    Self:SetResponse(oResponse:toJson())

    RestArea(aArea)
    RpcClearEnv()
Return .T.

import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    /**
     * Estado global do carregamento da aplicação (para tela cheia)
     */
    public isLoading = signal(false);

    /**
     * Abre o loading de tela cheia
     */
    show() {
        this.isLoading.set(true);
    }

    /**
     * Fecha o loading de tela cheia
     */
    hide() {
        this.isLoading.set(false);
    }
}

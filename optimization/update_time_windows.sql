-- Script para atualizar janelas de entrega baseado na localização geográfica
-- Janelas em minutos desde meia-noite

-- Zona Norte (lat > -23.53): manhã (8h-12h) = 480-720
UPDATE orders 
SET time_windows = '[[480, 720]]'::jsonb
WHERE lat > -23.53;

-- Zona Central (-23.53 a -23.57): meio-dia (10h-14h) = 600-840
UPDATE orders 
SET time_windows = '[[600, 840]]'::jsonb
WHERE lat <= -23.53 AND lat >= -23.57;

-- Zona Sul (lat < -23.57): tarde (12h-16h) = 720-960
UPDATE orders 
SET time_windows = '[[720, 960]]'::jsonb
WHERE lat < -23.57;

-- Verifica a distribuição
SELECT 
    CASE 
        WHEN lat > -23.53 THEN 'Norte (8h-12h)'
        WHEN lat >= -23.57 THEN 'Centro (10h-14h)'
        ELSE 'Sul (12h-16h)'
    END as zona,
    COUNT(*) as pedidos,
    time_windows
FROM orders
GROUP BY 
    CASE 
        WHEN lat > -23.53 THEN 'Norte (8h-12h)'
        WHEN lat >= -23.57 THEN 'Centro (10h-14h)'
        ELSE 'Sul (12h-16h)'
    END,
    time_windows
ORDER BY zona;

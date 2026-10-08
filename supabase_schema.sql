-- ============================================================================
-- ESQUEMA DE BASE DE DATOS PARA TRES EN RAYA (TIC-TAC-TOE) EN SUPABASE
-- Ejecuta este script en el SQL Editor de tu proyecto en https://supabase.com
-- ============================================================================

-- 1. TABLA: matches (Historial completo de partidas disputadas)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    game_mode TEXT NOT NULL CHECK (game_mode IN ('pve', 'pvp')),
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard') OR difficulty IS NULL),
    player_x_name TEXT NOT NULL DEFAULT 'Jugador X',
    player_o_name TEXT NOT NULL DEFAULT 'Jugador O',
    winner TEXT NOT NULL CHECK (winner IN ('X', 'O', 'tie')),
    winning_combo INT2[] DEFAULT NULL,
    total_moves INT2 NOT NULL CHECK (total_moves >= 5 AND total_moves <= 9),
    duration_seconds INT4 NOT NULL DEFAULT 0,
    final_board TEXT[] NOT NULL,
    moves_history JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Índices para consultas de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON public.matches (winner);
CREATE INDEX IF NOT EXISTS idx_matches_player_x ON public.matches (player_x_name);

-- 2. TABLA: player_stats (Estadísticas agregadas y Ranking Global)
CREATE TABLE IF NOT EXISTS public.player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name TEXT UNIQUE NOT NULL,
    games_played INT4 NOT NULL DEFAULT 0,
    wins INT4 NOT NULL DEFAULT 0,
    losses INT4 NOT NULL DEFAULT 0,
    ties INT4 NOT NULL DEFAULT 0,
    hard_ai_wins INT4 NOT NULL DEFAULT 0,
    win_streak INT4 NOT NULL DEFAULT 0,
    best_win_streak INT4 NOT NULL DEFAULT 0,
    win_rate NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN games_played > 0 THEN ROUND((wins::numeric / games_played::numeric) * 100, 2)
        ELSE 0 END
    ) STORED,
    last_played_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índice para ordenar la tabla de clasificación
CREATE INDEX IF NOT EXISTS idx_player_stats_ranking ON public.player_stats (wins DESC, win_rate DESC);

-- 3. HABILITACIÓN DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACCESO PARAmatches (Lectura e Inserción pública anónima controlada)
DROP POLICY IF EXISTS "Permitir lectura publica de partidas" ON public.matches;
CREATE POLICY "Permitir lectura publica de partidas"
    ON public.matches FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir insercion publica de partidas" ON public.matches;
CREATE POLICY "Permitir insercion publica de partidas"
    ON public.matches FOR INSERT
    WITH CHECK (
        length(player_x_name) <= 30 AND
        length(player_o_name) <= 30 AND
        total_moves >= 5 AND
        total_moves <= 9
    );

-- 5. POLÍTICAS DE ACCESO PARA player_stats
DROP POLICY IF EXISTS "Permitir lectura publica del ranking" ON public.player_stats;
CREATE POLICY "Permitir lectura publica del ranking"
    ON public.player_stats FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion e insercion del ranking" ON public.player_stats;
CREATE POLICY "Permitir actualizacion e insercion del ranking"
    ON public.player_stats FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. FUNCIÓN Y TRIGGER AUTOMÁTICO PARA ACTUALIZAR EL RANKING AL GUARDAR UNA PARTIDA
CREATE OR REPLACE FUNCTION public.handle_match_player_stats()
RETURNS TRIGGER AS $$
DECLARE
    is_x_winner BOOLEAN := (NEW.winner = 'X');
    is_o_winner BOOLEAN := (NEW.winner = 'O');
    is_tie BOOLEAN := (NEW.winner = 'tie');
BEGIN
    -- Actualizar o insertar estadísticas del Jugador X
    INSERT INTO public.player_stats (
        player_name, games_played, wins, losses, ties, hard_ai_wins, win_streak, best_win_streak, last_played_at
    )
    VALUES (
        NEW.player_x_name,
        1,
        CASE WHEN is_x_winner THEN 1 ELSE 0 END,
        CASE WHEN is_o_winner THEN 1 ELSE 0 END,
        CASE WHEN is_tie THEN 1 ELSE 0 END,
        CASE WHEN is_x_winner AND NEW.game_mode = 'pve' AND NEW.difficulty = 'hard' THEN 1 ELSE 0 END,
        CASE WHEN is_x_winner THEN 1 ELSE 0 END,
        CASE WHEN is_x_winner THEN 1 ELSE 0 END,
        NEW.created_at
    )
    ON CONFLICT (player_name) DO UPDATE SET
        games_played = public.player_stats.games_played + 1,
        wins = public.player_stats.wins + CASE WHEN is_x_winner THEN 1 ELSE 0 END,
        losses = public.player_stats.losses + CASE WHEN is_o_winner THEN 1 ELSE 0 END,
        ties = public.player_stats.ties + CASE WHEN is_tie THEN 1 ELSE 0 END,
        hard_ai_wins = public.player_stats.hard_ai_wins + (
            CASE WHEN is_x_winner AND NEW.game_mode = 'pve' AND NEW.difficulty = 'hard' THEN 1 ELSE 0 END
        ),
        win_streak = CASE WHEN is_x_winner THEN public.player_stats.win_streak + 1 ELSE 0 END,
        best_win_streak = GREATEST(
            public.player_stats.best_win_streak,
            CASE WHEN is_x_winner THEN public.player_stats.win_streak + 1 ELSE public.player_stats.best_win_streak END
        ),
        last_played_at = NEW.created_at;

    -- Si es modo PvP (2 jugadores humanos), actualizar también estadísticas del Jugador O
    IF NEW.game_mode = 'pvp' AND NEW.player_o_name NOT ILIKE 'IA%' THEN
        INSERT INTO public.player_stats (
            player_name, games_played, wins, losses, ties, hard_ai_wins, win_streak, best_win_streak, last_played_at
        )
        VALUES (
            NEW.player_o_name,
            1,
            CASE WHEN is_o_winner THEN 1 ELSE 0 END,
            CASE WHEN is_x_winner THEN 1 ELSE 0 END,
            CASE WHEN is_tie THEN 1 ELSE 0 END,
            0,
            CASE WHEN is_o_winner THEN 1 ELSE 0 END,
            CASE WHEN is_o_winner THEN 1 ELSE 0 END,
            NEW.created_at
        )
        ON CONFLICT (player_name) DO UPDATE SET
            games_played = public.player_stats.games_played + 1,
            wins = public.player_stats.wins + CASE WHEN is_o_winner THEN 1 ELSE 0 END,
            losses = public.player_stats.losses + CASE WHEN is_x_winner THEN 1 ELSE 0 END,
            ties = public.player_stats.ties + CASE WHEN is_tie THEN 1 ELSE 0 END,
            win_streak = CASE WHEN is_o_winner THEN public.player_stats.win_streak + 1 ELSE 0 END,
            best_win_streak = GREATEST(
                public.player_stats.best_win_streak,
                CASE WHEN is_o_winner THEN public.player_stats.win_streak + 1 ELSE public.player_stats.best_win_streak END
            ),
            last_played_at = NEW.created_at;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador que ejecuta la función al insertar una partida en matches
DROP TRIGGER IF EXISTS trigger_match_player_stats ON public.matches;
CREATE TRIGGER trigger_match_player_stats
    AFTER INSERT ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_match_player_stats();

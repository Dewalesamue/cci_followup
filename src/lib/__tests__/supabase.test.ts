import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMemberSession, setChurchContext, supabase, MemberSessionData } from '../supabase';

// Mock the Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));

describe('supabase utilities', () => {
  describe('getMemberSession', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return null when no session exists', async () => {
      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await getMemberSession();
      expect(result).toBeNull();
    });

    it('should return null when session exists but member profile not found', async () => {
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'token-abc',
        refresh_token: 'refresh-xyz',
      };

      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Member not found' },
            }),
          }),
        }),
      });

      vi.spyOn(supabase, 'from').mockImplementation(mockFrom);

      const result = await getMemberSession();
      expect(result).toBeNull();
    });

    it('should return member session data when authenticated with valid member', async () => {
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'token-abc',
        refresh_token: 'refresh-xyz',
      };

      const mockMember = {
        id: 'member-456',
        user_id: 'user-123',
        church_id: 'futamap',
        full_name: 'John Doe',
        phone_number: '+1234567890',
        email: 'john@example.com',
        gender: 'Male',
        department: 'Computer Science',
        level: '300',
        faculty: 'Science',
        residence: 'Hostel A',
        birthday: '2000-01-01',
        date_joined: '2024-01-01',
        status: 'Active',
        map_name: 'FUTAMAP',
        profile_picture: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockMember,
              error: null,
            }),
          }),
        }),
      });

      vi.spyOn(supabase, 'from').mockImplementation(mockFrom);
      
      // Mock setChurchContext RPC call
      vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: null,
        error: null,
      } as any);

      const result = await getMemberSession();

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-123');
      expect(result?.memberId).toBe('member-456');
      expect(result?.fullName).toBe('John Doe');
      expect(result?.churchId).toBe('futamap');
      expect(result?.phoneNumber).toBe('+1234567890');
      expect(result?.email).toBe('john@example.com');
      expect(result?.accessToken).toBe('token-abc');
      expect(result?.refreshToken).toBe('refresh-xyz');
      expect(result?.authenticatedAt).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(supabase.auth, 'getSession').mockRejectedValue(
        new Error('Network error')
      );

      const result = await getMemberSession();
      expect(result).toBeNull();
    });
  });

  describe('setChurchContext', () => {
    it('should call Supabase RPC with correct church_id', async () => {
      const mockRpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: null,
        error: null,
      } as any);

      await setChurchContext('futamap');

      expect(mockRpc).toHaveBeenCalledWith('set_church_context', {
        church_id: 'futamap',
      });
    });

    it('should throw error when RPC fails', async () => {
      const mockError = { message: 'RPC failed' };
      vi.spyOn(supabase, 'rpc').mockResolvedValue({
        data: null,
        error: mockError,
      } as any);

      await expect(setChurchContext('futamap')).rejects.toThrow();
    });
  });
});
